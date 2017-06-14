/*eslint no-console: 0 */
const config = require('npm-package-config').list();
const bootstrapPlv8 = require('./lib/bootstrap')
const babel = require('babel-core')
const browserify = require('browserify')
const babelify = require('babelify')
const babelOptions = {
  presets: [
    require('babel-preset-es2015')
  ],
  plugins: [
    require('babel-plugin-transform-remove-console')
  ],
  ast: false,
  babelrc: false
}

module.exports = class PLV8 {

  install ({ modulePath, moduleName }, compact = true) {
    return this.init()
    .then(() => {
      return new Promise((resolve, reject) => {
        browserify({ ignoreMissing: true, standalone: moduleName })
          .transform(babelify, {
            global: true,
            presets: [
              require('babel-preset-es2015')
            ],
            plugins: [
              require('babel-plugin-transform-remove-console')
            ],
            ast: false,
            babelrc: false,
            compact
          })
          .require(modulePath, { entry: true })
          .bundle((err, buf) => {
            if (err) return reject(err)

            const code = `
              (function () {
                var module = {
                  exports: { }
                };
                var exports = module.exports;
                ${buf.toString()}
                return module
              })()`

            return resolve(code)
          })
          .on('error', err => {
            console.error('Error: ', err.message)
          })
      })
    })
    .then(code => {
      return this.knex.withSchema(config.pg_schema).select('*').from(config.pg_modules_table).where({ name: moduleName })
        .then(result => {
          if (result.length > 0) {
            return this.knex(`${config.pg_schema}.${config.pg_modules_table}`).update({ code }).where({ name: moduleName })
          }
          else {
            return this.knex(`${config.pg_schema}.${config.pg_modules_table}`).insert({ code, name: moduleName })
          }
        })
    })
    .then(() => moduleName)
  }

  uninstall (moduleId) {
    const name = moduleId.replace(/^@\w+\//, '')
    return this.knex(`${config.pg_schema}.${config.pg_modules_table}`).where({ name }).del()
      .then(() => true)
  }

  on (event, handler) {
    return this.knex.client.acquireRawConnection().then(c => {
      c.on('notification', msg => {
        if (msg.channel !== event) return
        if (msg.payload === 'undefined') {
          return handler(null, msg)
        }

        try {
          handler(JSON.parse(msg.payload), msg)
        }
        catch (e) {
          console.log(msg)
          handler(null, msg)
        }
      })
      c.query(`listen ${event}`)
    })
  }

  eval (f, compact = true) {
    let es5
    const template = `
      (function () {
        try {
          return (${f.toString()})()
        }
        catch (e) {
          return {
            error: true,
            stack: e.stack,
            message: e.message
          }
        }
      })`

    try {
      babelOptions.compact = compact
      es5 = babel.transform(template.toString(), babelOptions)
    }
    catch (e) {
      console.error(e)
      return Promise.reject(e)
    }
    const code = es5.code.slice(0, -1)

    return this.knex.raw(`select ${config.pg_schema}.eval(?) as val`, [ `${code}()` ])
      .then(({ rows: [ result ] }) => {
        const val = result && result.val
        if (val && val.error === true) {
          const err = new Error(val.message)
          err.stack = val.stack
          return Promise.reject(err)
        }
        else {
          return val || { }
        }
      })
  }

  init () {
    return this.knex('pg_catalog.pg_namespace').select(this.knex.raw(true)).where({ nspname: config.pg_schema })
      .then(([ exists ]) => {
        if (exists) {
          return
        }
        else {
          return this.knex.raw(`create schema if not exists "${config.pg_schema}"`)
        }
      })
      .then(() => {
        return this.knex('pg_available_extensions').select().where({ name: 'plv8' })
          .then(([ ext ]) => {
            if (ext.installed_version) {
              return
            }
            else {
              return this.knex.raw('create extension if not exists plv8')
            }
          })
      })
      .then(() => {
        return this.knex.schema.withSchema(config.pg_schema).createTableIfNotExists(config.pg_modules_table, table => {
          table.increments()
          table.text('name')
          table.text('code')
        })
      })
      .then(() => {
        return bootstrapPlv8(this.knex)
      })
  }

  constructor (knex) {
    this.knex = knex
  }
}
