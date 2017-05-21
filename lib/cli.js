#!/usr/bin/env node

'use strict';

const program = require('commander')

program
  .version('1.0.0')
  .option('-U, --user <user>', 'database user name', 'postgres')
  .option('-H, --host <host>', 'database server hostname or IP or socket', 'localhost')
  .option('-p, --port <port>', 'database server port', 5432)
  .option('-d, --db <db>', 'database name to connect to', 'postgres')

program
  .command('install <modules...>')
  .description('install one or more packages into the DB')
  .alias('i')
  .action((command, modules, options) => install(modules,options))

program
  .command('uninstall <module...>')
  .description('uninstall one or more packages from the DB')
  .alias('u')
  .action((command, modules, options) => uninstall(modules,options))

program
  .command('list')
  .description('list the packages currently installed in the DB')
  .alias('l')
  .action((options) => list(options))

program.parse(process.argv)

function init(options) {
  const globalOpts = options.parent
  const PLV8 = require('..'),
    knex = require('knex'),
    plv8 = new PLV8(knex({
      client: 'pg',
      connection: {
        host: globalOpts.host,
        database: globalOpts.db,
        user: globalOpts.user,
        password: process.env.PGPASS
      }
    }))
  return plv8
}


function list(options) {
  const plv8 = init(options)
  console.log('Currently installed modules:')
  plv8.knex
    .select('name')
    .from(`${plv8.nodePlv8Schema}.modules`)
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
    plv8.knex(`${plv8.nodePlv8Schema}.modules`)
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
