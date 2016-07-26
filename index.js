/*eslint no-console: 0 */
const path = require('path')
const bootstrapPlv8 = require('./lib/bootstrap')
const babel = require('babel-core')
const evalOptions = {
  presets: [
    require('babel-preset-es2015')
  ],
  ast: false,
  babelrc: false
}
const installOptions = {
  presets: [
    require('babel-preset-es2015')
  ],
  plugins: [
    require('babel-plugin-transform-es2015-modules-umd')
  ],
  ast: false,
  babelrc: false
}

module.exports = class PLV8 {

  install (moduleId, cwd = process.cwd()) {
    let modulePath, pkgPath, pkg

    try {
      modulePath = require.resolve(path.resolve(cwd, 'node_modules', moduleId))
      pkgPath = require.resolve(path.resolve(cwd, 'node_modules', moduleId, 'package.json'))
      pkg = require(pkgPath)
    }
    catch (e) {
      console.error(e)
    }

    const es5 = babel.transformFileSync(modulePath, installOptions)
    const code = `
      (function () {
        var module = {
          exports: { }
        };
        var exports = module.exports;

        ${es5.code}

        return module
      })()`

    return this.knex.schema.hasTable('v8.modules')
      .then(exists => {
        if (exists) {
          return code
        }
        else {
          return this.init().then(() => code)
        }
      })
      .then(code => {
        return this.knex('v8.modules').select('*').where({ name: moduleId })
          .then(result => {
            if (result.length > 0) {
              return this.knex('v8.modules').update({ code, pkg }).where({ name: moduleId })
            }
            else {
              return this.knex('v8.modules').insert({ code, pkg, name: moduleId })
            }
          })
      })
      .then(() => moduleId)
  }

  uninstall (moduleId) {
    const name = moduleId.replace(/^@\w+\//, '')
    return this.knex('v8.modules').where({ name }).del()
      .then(() => true)
  }

  eval (f) {
    const es5 = babel.transform(f.toString(), evalOptions)
    const code = es5.code.slice(0, -1)
    return this.knex.raw('select v8.eval(?) as val', [ `${code}()` ])
      .then(({ rows: [ result ] }) => {
        return result && result.val
      })
  }

  init () {
    return this.knex.raw('create schema if not exists "v8"')
      .then(() => {
        return this.knex.raw('create extension plv8')
      })
      .then(() => {
        return this.knex.schema.createTableIfNotExists('v8.modules', table => {
          table.increments()
          table.text('name')
          table.jsonb('pkg')
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
