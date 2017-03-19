/*eslint no-console: 0 */
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
      return this.knex('v8.modules').select('*').where({ name: moduleName })
        .then(result => {
          if (result.length > 0) {
            return this.knex('v8.modules').update({ code }).where({ name: moduleName })
          }
          else {
            return this.knex('v8.modules').insert({ code, name: moduleName })
          }
        })
    })
    .then(() => moduleName)
  }

  uninstall (moduleId) {
    const name = moduleId.replace(/^@\w+\//, '')
    return this.knex('v8.modules').where({ name }).del()
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

    return this.knex.raw('select v8.eval(?) as val', [ `${code}()` ])
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
    return this.knex('pg_catalog.pg_namespace').select().where({ nspname: 'v8' })
      .then(([ schema ]) => {
        if (schema) {
          return
        }
        else {
          return this.knex.raw('create schema if not exists "v8"')
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
        return this.knex.schema.createTableIfNotExists('v8.modules', table => {
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
