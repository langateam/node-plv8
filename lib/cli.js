#!/usr/bin/env node

'use strict';

const config = require('npm-package-config').list();

const program = require('commander')

program
  .version('1.0.0')

program
  .command('install <modules...>')
  .description('install one or more packages into the DB')
  .alias('i')
  .action((modules, options) => install(modules,options))

program
  .command('uninstall <module...>')
  .description('uninstall one or more packages from the DB')
  .alias('u')
  .action((modules, options) => uninstall(modules,options))

program
  .command('list')
  .description('list the packages currently installed in the DB')
  .alias('l')
  .action((options) => list(options))

program
  .on('--help', () => console.log(`
    Environment Configuration Options
    (Set with npm config or in your package.json)

      pg_user: The name of the PostgreSQL user with which to authenticate     -- default "postgres"; current "${config.pg_user}"
      pg_pass: The password of the PostgreSQL user with which to authenticate -- default "postgres"; current "****"
      pg_host: The name of the PostgreSQL server with which to connect        -- default "localhost"; current "${config.pg_host}"
      pg_port: The port number of the PostgreSQL server                       -- default 5432; current "${config.pg_port}"
      pg_database: The database with which to interact                        -- default "postgres"; current "${config.pg_database}"
      pg_schema: the name of the schema in which to store modules             -- default "v8"; current "${config.pg_schema}"
      pg_modules_table: The name of the table in which to store modules       -- default "modules"; current "${config.pg_modules_table}"
    `)
    )
      
program.parse(process.argv)

function init(options) {
  const PLV8 = require('..'),
    knex = require('knex'),
    plv8 = new PLV8(knex({
      client: 'pg',
      connection: {
        host: config.pg_host,
        port: config.pg_port,
        database: config.pg_database,
        user: config.pg_user,
        password: config.pg_pass
      }
    }))
  return plv8
}


function list(options) {
  const plv8 = init(options)
  console.log('Currently installed modules:')
  plv8.knex
    .select('name')
    .from(`${config.pg_schema}.modules`)
    .then(result => {
      result.forEach(row => console.log(row.name));
    })
    .then(() => plv8.knex.destroy() )
    .catch(err => {
      console.log(""+err)
      process.exit(1)
    })
}

function uninstall(modules, options) {
  const plv8 = init(options)
  modules.forEach(name => {
    plv8.knex(`${config.pg_schema}.${config.pg_modules_table}`)
      .where({name})
      .del()
      .returning({name})
      .then(result => console.log(`${result} removed`) )
      .then(() => plv8.knex.destroy() )
      .catch(err => {
        console.log(""+err)
        process.exit(1)
      })
  })
}

function install(modules, options) {
  if (!modules.length) {
    console.error('One or more package arguments required.')
    process.exit(1)
  }

  const plv8 = init(options)
  let moduleInstalls = modules.reduce((promiseChain, item) => {
    return promiseChain.then(() => new Promise((resolve) => {
      plv8
        .install({
          modulePath: require.resolve(item),
          moduleName: item
        })
        .then(moduleName => {
          console.log(`module ${moduleName} installed`)
          resolve()
        })
        .catch(err => {
          console.log(""+err)
          process.exit(1)
        })
    }))
  }, Promise.resolve())


  moduleInstalls
    .then(() => plv8.knex.destroy() )
}
