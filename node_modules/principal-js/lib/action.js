import { PrincipalInvalidObject } from './errors'
import { createNeed } from './need'
import { NAME_PROP, LABEL_PROP, INHERIT_FROM_PROP } from './resolve-action'

const util = require('util')

class Action {
  constructor ({ name, label, inheritFrom }) {
    this[NAME_PROP] = name
    this[LABEL_PROP] = label
    this[INHERIT_FROM_PROP] = [].concat(inheritFrom)
  }

  [util.inspect.custom] () {
    return this[NAME_PROP]
  }
}

export function createAction ({
  name, label, inheritFrom
}, principal) {
  let action = new Proxy(new Action({ name, label, inheritFrom }), {
    get (obj, prop) {
      if (prop in obj) {
        return obj[prop]
      }
      // bypass wellknown symbols like Symbol.iterator
      if (typeof prop === 'symbol') {
        return obj[prop]
      }
      let object = principal._objects[prop]
      if (object) {
        return createNeed({ action, object, decorations: [] }, principal)
      }
      throw new PrincipalInvalidObject('invalid object ' + prop)
    }
  })
  return action
}
