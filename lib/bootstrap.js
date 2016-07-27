/*eslint no-undef: -1, no-var: 0, camelcase: 0 */
const _ = require('lodash')
const pkg = require('../package')
const babel = require('babel-core')
const evalOptions = {
  presets: [
    require('babel-preset-es2015')
  ],
  ast: false,
  babelrc: false
}

function plv8_init () {
  return `
  function plv8_init () {
    if (typeof v8 === "undefined") {
      v8 = {
        require: ${plv8_require.toString()},
        xpressionToBody: ${xpressionToBody.toString()},
        requireStack: [],
        global: { },
        version: '${pkg.version}'
      }
      require = v8.require
      require.cache = { }

      plv8x = v8
    }
  }
  `
}

function xpressionToBody(code){
  return '(' + code + ')'
}

module.exports = function(knex) {
  return knex.raw(`
      SET client_min_messages TO WARNING;
      DO $$ BEGIN
        CREATE EXTENSION IF NOT EXISTS plv8;
        EXCEPTION WHEN OTHERS THEN END;
      $$;`)
    .then(() => {
      return knex.raw(`SET plv8.start_proc = 'v8.plv8_init';`)
    })
    .then(() => {
      return knex.raw(`
        DO $$ BEGIN
        CREATE DOMAIN v8.json AS json;
        EXCEPTION WHEN OTHERS THEN END;
      $$;`)
    })
    .then(() => {
      return knex.raw(createStoredProcedure('v8.plv8_init', { }, 'void', plv8_init()))
    })
    .then(() => {
      return Promise.all([
        knex.raw(createStoredProcedure('v8.eval', {
          str: 'text'
        }, 'v8.json', plv8_eval)),
        knex.raw(createStoredProcedure('v8.apply', {
          str: 'text',
          args: 'v8.json'
        }, 'v8.json', plv8_apply)),
        knex.raw(createStoredProcedure('v8.json_eval', {
          code: 'text'
        }, 'v8.json', wrapStoredProcedure(0), {
          cascade: true,
          boot: true
        })),
        knex.raw(createStoredProcedure('v8.json_eval', {
          data: 'v8.json',
          code: 'text'
        }, 'v8.json', wrapStoredProcedure(-1), {
          cascade: true,
          boot: true
        })),
        knex.raw(createStoredProcedure('v8.json_eval', {
          code: 'text',
          data: 'v8.json'
        }, 'v8.json', wrapStoredProcedure(1), {
          cascade: true,
          boot: true
        }))
      ])
      .then(() => {
        return knex.raw('select v8.plv8_init()')
      })
    })
}
function plv8_eval (str) {
  return eval(str)
}
function plv8_apply (func, args){
  func = '(function() {return (' + func + ');})()'
  return eval(func).apply(null, args)
}


function plv8_require (name) {
  if (!require.cache[name]) {
    var module = plv8.execute('select name, code from v8.modules where name = $1', [ name ])[0]

    if (!module) {
      plv8.elog(WARNING, 'Cannot find module \'' + name + '\'')
      return new Error('Cannot find module \'' + name + '\'')
    }

    require.cache[name] = eval(module.code)
  }

  return require.cache[name].exports
}

function wrapStoredProcedure (type = 1) {
  switch (type) {
  case (type > 0):
    return function wrapped (code, data){
      return eval(xpressionToBody(code)).apply(data)
    }
  case (type < 0):
    return function wrapped (data, code){
      return eval(xpressionToBody(code)).apply(data)
    }
  default:
    return function wrapped (code){
      return eval(xpressionToBody(code)).apply(this)
    }
  }
}

function createStoredProcedure (name, paramObj, ret, func) {
  const signature = _.map(paramObj, (type, key) => {
    return {
      arg: (type === 'v8.json') ? `JSON.parse('${key}')` : key,
      param: `${key} ${type}`
    }
  })
  const params = _.map(signature, ({ param }) => param).join(',')
  const args = _.map(signature, ({ arg }) => arg).join(',')
  const es5 = babel.transform(func.toString(), evalOptions)
  const code = es5.code.replace(/['"]use strict['"];/, '')

  let statement = `(${code})(${args})`

  if (ret === 'v8.json') {
    statement = `JSON.stringify(${statement})`
  }

  return `
    SET client_min_messages TO WARNING;

    DO $PLV8X_EOF$
    BEGIN
      DROP FUNCTION IF EXISTS ${name} (${params}) CASCADE;
      EXCEPTION WHEN OTHERS THEN END;
    $PLV8X_EOF$;
    
    CREATE FUNCTION ${name} (${params}) RETURNS ${ret} AS $PLV8X__BODY__$
      try {
        return ${statement};
      }
      catch (e) {
        return e;
      }
    $PLV8X__BODY__$ LANGUAGE plv8 IMMUTABLE STRICT;
  `
}
