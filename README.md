# node-plv8

[![NPM version][npm-image]][npm-url]
[![Build status][ci-image]][ci-url]
[![Dependency Status][daviddm-image]][daviddm-url]
[![Code Climate][codeclimate-image]][codeclimate-url]

`require()` node modules in [PLV8](https://github.com/plv8/plv8). Optimize your Node.js Backend by offloading work directly onto the database (PostgreSQL). Send/receive events between Node and PLV8.

## Install

```sh
$ npm install --save plv8
```

## Usage

### Node API

#### `install (module, [cwd])`

Install a Node module which can be loaded into the plv8 context by using the `require()` method.

#### `uninstall (module)`

Remove a previously installed module.

#### `eval (code)`

Evaluate a block of Javascript on the fly.

### `on (event, handler)`

Listen for a Postgres [NOTIFY](https://www.postgresql.org/docs/9.5/static/sql-notify.html) event, and invoke the given `handler` when the event is emitted.

### Postres API

#### `require (module)`

Load an installed Node module.

#### `log (level, message)`

Send a log message to the Node.js application.

#### `emit (event, payload)`

Emit an aribtrary event to the Node.js application via [NOTIFY](https://www.postgresql.org/docs/9.5/static/sql-notify.html).

### Example

```js
// setup plv8 connection
const PLV8 = require('plv8')
const plv8 = new PLV8({
  client: 'pg',
  connection: {
    // knex.js connection object
  }
})

// setup a log listener
plv8.on('log:error', msg => {
  console.error(msg)
})

// setup a listener
plv8.on('user:updated', user => {
  // do some stuff with the "user" object
})

// install the lodash module so that it can be loaded (via require()) later
plv8.install(require.resolve('lodash'))
  .then(() => {

    // eval some code
    return plv8.eval(() => {
      const _ = require('lodash')
      return _.map([ 1, 2, 3 ], e => e + 1)
    })
  })
  .then(result => {
    // result = [ 2, 3, 4 ]
  })
```

```js
// send some events to the client 
plv8.eval(() => {
  const _ = require('lodash')
  const veryImportantValue = _.map([ 1, 2, 3 ], e => e + 1)

  // maybe I want to send this event to the client, but continue doing more things
  plv8.emit('user:updated', {
    username: 'tjwebb',
    email: 'tjwebb@langa.io'
  })

  try {
    return veryImportantValue + 1
  }
  catch (e) {
    plv8.log('error', e)
    return 0
  }
})

```

#### 2. 

## PLV8 Extension

This module requires the [plv8](https://pgxn.org/dist/plv8/doc/plv8.html) Postgres extension.

```sh
$ easy_install pgxnclient
$ pgxnclient install plv8
```

## Forked!

This is a fork of [plv8x](https://github.com/clkao/plv8x) that has been streamlined down to the essentials, and extended with additional API features. Important differences:

- 90%+ smaller than plv8x (~20kb vs. 300+ kb)
- Removed [node-pg-native](https://github.com/brianc/node-pg-native)
- Removed Livescript / Coffeescript Support
- Removed CLI
- Removed unused/unneeded dependencies
- Transpile modules using babel instead of browserify

## License
MIT

## Maintained By
[<img src='http://i.imgur.com/Y03Jgmf.png' height='64px'>](http://langa.io)

[npm-image]: https://img.shields.io/npm/v/plv8.svg?style=flat-square
[npm-url]: https://npmjs.org/package/plv8
[ci-image]: https://img.shields.io/travis/langateam/node-plv8/master.svg?style=flat-square
[ci-url]: https://travis-ci.org/langateam/node-plv8
[daviddm-image]: http://img.shields.io/david/langateam/node-plv8.svg?style=flat-square
[daviddm-url]: https://david-dm.org/langateam/node-plv8
[codeclimate-image]: https://img.shields.io/codeclimate/github/langateam/node-plv8.svg?style=flat-square
[codeclimate-url]: https://codeclimate.com/github/langateam/node-plv8
