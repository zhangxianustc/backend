const util = require('util')

const realObject = Symbol('realObject')

const assureOwnProperty = function assureOwnProperty (o) {
  return new Proxy(o, {
    get (obj, prop) {
      if (prop === realObject) {
        return obj
      }
      if (prop === 'inspect' || prop === util.inspect.custom) {
        return util.inspect(o)
      }
      if (prop in o || typeof prop === 'symbol') {
        let ret = o[prop]
        if (typeof ret === 'object') {
          return assureOwnProperty(ret)
        }
        return ret
      }
      throw new Error(o + ' has no such property: ' + prop)
    }
  })
}

assureOwnProperty.realObject = realObject

module.exports = assureOwnProperty
