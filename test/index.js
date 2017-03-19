const assert = require('assert')
const knex = require('knex')
const PLV8 = require('../')

describe('plv8', () => {
  const knexHandle = knex({
    client: 'pg',
    connection: {
      host: process.env.PLV8_HOST,
      user: process.env.PLV8_USER,
      password: process.env.PLV8_PASSWORD,
      database: process.env.PLV8_DATABASE
    }
  })
  const plv8 = new PLV8(knexHandle)

  describe('#install', () => {
    it('should install a module', () => {
      return plv8.install({
        modulePath: require.resolve('./testmodule'),
        moduleName: 'testmodule'
      })
      .then(moduleName => {
        assert.equal(moduleName, 'testmodule')
      })
    })
  })
  describe('#uninstall', () => {
    before(() => {
      return plv8.install({
        modulePath: require.resolve('./testmodule'),
        moduleName: 'testmodule'
      })
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
      return plv8.install({
        modulePath: require.resolve('./testmodule'),
        moduleName: 'testmodule'
      })
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
        assert.equal(result, 'helloworld required value')
      })
    })
  })
  describe('#emit', () => {
    it('should emit event from postgres and handle in node.js', done => {
      knexHandle.client.acquireRawConnection().then(c1 => {
        c1.on('notification', msg => {
          assert.equal(msg.channel, 'testevent')
          done()
        })
        c1.query('listen testevent')

        plv8.eval(() => {
          plv8.emit('testevent')
        })
      })
    })
  })
  describe('#on', () => {
    it('should emit event from postgres and handle in node.js', done => {
      plv8.on('testevent2', payload => {
        assert(payload)
        assert.equal(payload.message, 'hello')
        done()
      }).then(() => {
        plv8.eval(() => {
          plv8.emit('testevent2', { message: 'hello' })
        })
      })
    })
  })
})
