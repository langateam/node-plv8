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
      if (plv8.require && require) return

      plv8.emit = ${plv8_emit.toString()};
      plv8.log = ${plv8_log.toString()};
      plv8.require = ${plv8_require.toString()};
      plv8.xpressionToBody = ${xpressionToBody.toString()};
      plv8.nodePlv8 = ${JSON.stringify(pkg)};
      plv8.require.cache = { }

      require = plv8.require
    }
  `
}

function plv8_log (level, message) {
  return plv8_emit(`log:${level}`, { message: message })
}

function plv8_emit (event, payload) {
  try {
    payload = JSON.stringify(payload)
    plv8.execute('notify ' + event + ', \'' + payload + '\'')
  }
  catch (e) {
    plv8.execute('notify ' + event)
  }
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
      $$;`.replace(/\n/g, ''))
    .then(() => {
      return knex.raw(`SET plv8.start_proc = 'v8.plv8_init';`)
    })
    .then(() => {
      return knex.raw(`
        DO $$ BEGIN
          CREATE DOMAIN v8.json AS json;
          EXCEPTION WHEN OTHERS THEN END;
      $$;`.replace(/\n/g, ''))
    })
    .then(() => {
      return knex.raw(createStoredProcedure('v8.plv8_init', { }, 'void', plv8_init(), true))
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
  var module = plv8.execute('select name, code from v8.modules where name = $1', [ name ])[0];

  if (!module) {
    plv8.elog(WARNING, 'Cannot find module \'' + name + '\'');
    return new Error('Cannot find module \'' + name + '\'');
  }

  require.cache[name] = eval(module.code)
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

function createStoredProcedure (name, paramObj, ret, func, init) {
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

  let initStatement = 'plv8.execute("select v8.plv8_init()");'
  if (init) {
    initStatement = ''
  }
  return `
    DO $PLV8X_EOF$
    BEGIN
      drop function if exists ${name} (${params});
    end;
    $PLV8X_EOF$;

    CREATE or replace FUNCTION ${name} (${params}) RETURNS ${ret} AS $$
      ${initStatement}

      try {
        return ${statement};
      }
      catch (e) {
        plv8.log('error', e.message);
        plv8.log('error', e.stack);
        return e;
      }
    $$ LANGUAGE plv8;
  `.replace(/\n/g, '')
}
