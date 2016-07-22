# node-plv8

[![NPM version][npm-image]][npm-url]
[![Build status][ci-image]][ci-url]
[![Dependency Status][daviddm-image]][daviddm-url]
[![Code Climate][codeclimate-image]][codeclimate-url]

Use node modules in [PLV8](https://github.com/plv8/plv8). Optimize your Node.js Backend by offloading work directly onto the database (PostgreSQL).

This is a fork of [plv8x](https://github.com/clkao/plv8x) that has been streamlined down to the essentials. Important differences:

- 90% smaller than plv8x (~20kb vs. 300+ kb)
- Removed [node-pg-native](https://github.com/brianc/node-pg-native)
- Removed Livescript / Coffeescript Support
- Removed CLI
- Removed unused/unneeded dependencies
- Build modules using babel instead of browserify

## Install

```sh
$ npm install --save plv8
```

## Usage

### API

#### `install (module, [cwd])`

#### `uninstall (module)`

#### `eval (code)`

### Example

```js
const PLV8 = require('plv8')
const plv8 = new PLV8({
  client: 'pg',
  connection: {
    // knex.js connection object
  }
})

plv8.install(require.resolve('lodash'))
  .then(() => {
    return plv8.eval(() => {
      const _ = require('lodash')
      return _.map([ 1, 2, 3 ], e => {
        return e + 1
      })
    })
  })
  .then(result => {
    // result = [ 2, 3, 4 ]
  })
  .catch(err => {
    // handle error
  })
```

## License
MIT

## Maintained By
[<img src='http://i.imgur.com/Y03Jgmf.png' height='64px'>](http://langa.io)

[npm-image]: https://img.shields.io/npm/v/plv8.svg?style=flat-square
[npm-url]: https://npmjs.org/package/plv8
[ci-image]: https://img.shields.io/travis/langateam/plv8/master.svg?style=flat-square
[ci-url]: https://travis-ci.org/langateam/plv8
[daviddm-image]: http://img.shields.io/david/langateam/plv8.svg?style=flat-square
[daviddm-url]: https://david-dm.org/langateam/plv8
[codeclimate-image]: https://img.shields.io/codeclimate/github/langateam/plv8.svg?style=flat-square
[codeclimate-url]: https://codeclimate.com/github/langateam/plv8
