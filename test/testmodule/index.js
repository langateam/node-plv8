const requiredModule = require('./required')

module.exports = {
  hello (msg) {
    return 'hello' + msg + ' ' + requiredModule.value
  }
}
