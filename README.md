# plv8

[![NPM version][npm-image]][npm-url]
[![Build status][ci-image]][ci-url]
[![Dependency Status][daviddm-image]][daviddm-url]
[![Code Climate][codeclimate-image]][codeclimate-url]

Run Node modules in [PLV8](https://github.com/plv8/plv8).

This is a fork of [plv8x](https://github.com/clkao/plv8x) that has been streamlined down to the essentials. Important differences:

- 90% smaller than plv8x (20kb vs. 300+ kb)
- Removed [node-pg-native](https://github.com/brianc/node-pg-native)
- Removed Livescript / Coffeescript Support
- Removed [`-f`](https://github.com/clkao/plv8x#calling-conventions-for-user-functions) command
- Removed unused/unneeded dependencies

## Install

```sh
$ npm install --save plv8
```

### Usage

### API

TODO


### CLI

Install with `-g` to use CLI

```sh
$ npm install -g plv8
```

```
Usage: plv8 {OPTIONS}

Options:
  --db, -d       database connection string
  --list, -l     List bundles
  --purge        Purge bundles
  --import, -i   Import bundles
  --delete       Delete bundles
  --query, -c    Execute query
  --eval, -e     Eval the given expression in plv8x context
  --require, -r  Require the given file and eval in plv8x context
  --json, -j     Use JSON for output
  --help, -h     Show this message
```

## License
MIT

## Maintained By
[<img src='http://i.imgur.com/Y03Jgmf.png' height='64px'>](http://langa.io)

[npm-image]: https://img.shields.io/npm/v/plv8.svg?style=flat
[npm-url]: https://npmjs.org/package/plv8
[ci-image]: https://img.shields.io/travis/langateam/plv8/master.svg?style=flat
[ci-url]: https://travis-ci.org/langateam/plv8
[daviddm-image]: http://img.shields.io/david/langateam/plv8.svg?style=flat
[daviddm-url]: https://david-dm.org/langateam/plv8
[codeclimate-image]: https://img.shields.io/codeclimate/github/langateam/plv8.svg?style=flat
[codeclimate-url]: https://codeclimate.com/github/langateam/plv8
