const assert = require('assert')
const knex = require('knex')
const PLV8 = require('../')

describe('plv8', () => {
  const plv8 = new PLV8(knex({
    client: 'pg',
    connection: {
      host: process.env.PLV8_HOST,
      user: process.env.PLV8_USER,
      password: process.env.PLV8_PASSWORD,
      database: process.env.PLV8_DATABASE
    }
  }))
  describe('#install', () => {
    it('should install a module', () => {
      return plv8.install('testmodule', __dirname)
        .then(moduleName => {
          assert.equal(moduleName, 'testmodule')
        })
    })
  })
  describe('#uninstall', () => {
    before(() => {
      return plv8.install('testmodule', __dirname)
        .then(moduleName => {
          assert.equal(moduleName, 'testmodule')
        })
    })
    it('should uninstall a module', () => {
      return plv8.uninstall('testmodule')
        .then(deleted => {
          assert(deleted)
        })
    })

  })
  describe('#eval', () => {
    before(() => {
      return plv8.install('testmodule', __dirname)
        .then(moduleName => {
          assert.equal(moduleName, 'testmodule')
        })
    })

    it('should eval an arbitrary function', () => {
      return plv8.eval(() => 42)
        .then(result => {
          assert.equal(result, 42)
        })
    })
    it('should invoke function on installed module', () => {
      return plv8.eval(() => {
        const tm = require('testmodule')
        return tm.hello('world')
      })
      .then(result => {
        assert.equal(result, 'helloworld')
      })
    })
  })
})
