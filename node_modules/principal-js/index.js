import debug_ from 'debug'
import * as needLib from './lib/need'
import { createAction } from './lib/action'
import util from 'util'
import * as errors from './lib/errors'
import { createPermission } from './lib/permission'
import resolveAction from './lib/resolve-action'

const debug = debug_('principal')

function objectValues (obj) {
  let ret = []
  for (let k in obj) {
    if (obj.hasOwnProperty(k)) {
      ret.push(obj[k])
    }
  }
  return ret
}

export class Principal {
  constructor () {
    this._actions = {}
    this._objects = {}
    this._decorations = {}
    this._scope = []
    this._needHandlers = {}
    this._defaultLabelTemplate = ({ action, object, decorations }) => {
      let s = action + ' ' + object
      if (decorations && decorations.length) {
        s += `[${decorations.join(',')}]`
      }
      return s
    }
    this.actions = (function (principal) {
      return new Proxy({}, {
        get (obj, prop) {
          return principal.getAction(prop)
        }
      })
    })(this)
  }

  [util.inspect.custom] () {
    return this.toJson()
  }

  getNeedHandlers (need) {
    // need will be converted using toString automatically, so don't worry
    // if it is a Need
    return this._needHandlers[need] || []
  }

  getAction (name) {
    let ret = this._actions[name]
    if (!ret) {
      throw new errors.PrincipalInvalidAction('invalid action ' + name)
    }
    return ret
  }

  fromJson (json) {
    let { actions, objects, decorations, scope } = typeof json === 'string' ? JSON.parse(json) : json

    for (let action of actions) {
      this.addAction(action.name, action.label, action.inheritFrom)
    }
    for (let object of objects) {
      this.addObject(object.name, object.label)
    }
    for (let { name, label } of decorations) {
      this.addDecoration(name, label)
    }
    this.setScope(scope.map(({ action, object, decorations }) => {
      let ret = this.getAction(action)[object]
      for (let decoration of decorations) {
        ret = ret[decoration]
      }
      return ret
    }))
    return this
  }

  toJson () {
    return {
      actions: objectValues(this._actions).map(it => resolveAction(it).toJson()),
      objects: objectValues(this._objects),
      decorations: objectValues(this._decorations),
      scope: this._scope.map(it => {
        it = needLib.resolve(it)
        return {
          action: resolveAction(it.action).name,
          object: it.object.name,
          decorations: it.decorations.map(it => it.name)
        }
      })
    }
  }

  setLabelTemplate (template) {
    this._labelTemplate = template
  }

  getNeedLabel ({ action, object, decorations }) {
    return (this._labelTemplate || this._defaultLabelTemplate).apply(
      this, [{ action, object, decorations }])
  }

  addAction (name, label, inheritFrom) {
    debug('add action ' + name)
    inheritFrom = inheritFrom || []

    if (this._actions[name]) {
      throw new Error('there is an action with the same name ' + name)
    }

    inheritFrom = [].concat(inheritFrom).map(it => {
      let action = this._actions[it]
      if (!action) {
        throw new Error('no such action ' + it)
      }
      return action
    })

    this._actions[name] = createAction({
      name, label: label || name, inheritFrom
    }, this)
    return this
  }

  addObject (name, label) {
    this._objects[name] = { name, label: label || name }
    return this
  }

  addDecoration (name, label) {
    this._decorations[name] = { name, label: label || name }
    return this
  }

  addNeedHandler (need, handler) {
    // need will be converted to string using toString if IT IS A NEED
    this._needHandlers[need] = (this._needHandlers[need] || []).concat(handler)
    return this
  }

  setScope (...args) {
    if (Array.isArray(args[0])) {
      this._scope = args[0]
    } else if (typeof args[0] === 'function') {
      this._scope = [].concat(args[0].apply(this, [this._scope]))
    } else {
      this._scope = args
    }
    this._scope = this._scope.map(need => typeof need === 'string'
      ? this.assureNeed(need)
      : need
    )
    return this
  }

  get scope () {
    return this._scope
  }

  can (needs, args) {
    return createPermission(this, needs).can(args)
  }

  try (needs, args) {
    return createPermission(this, needs).try(args)
  }

  hasBiggerNeedsThan (need, args) {
    need = this.assureNeed(need)
    let ret = false
    for (let myNeed of this._scope) {
      if (needLib.resolve(myNeed).pass(need) && myNeed.toString() !== need.toString()) {
        ret = true
        break
      }
    }
    return ret
  }

  resolveNeed (need) {
    return needLib.resolve(this.assureNeed(need))
  }

  assureNeed (arg) {
    if (arg instanceof needLib.Need) {
      return arg
    }
    if (typeof arg === 'string') {
      arg = needLib.parseNeed(arg)
    }
    let { action, object, decorations } = arg
    return decorations.reduce((a, b) => a[b], this.getAction(action)[object])
  }

  clone () {
    let ret = new Principal().fromJson(this.toJson())
    ret._labelTemplate = this._labelTemplate
    return ret
  }
}

export { default as errors } from './lib/errors'
export { createPermission } from './lib/permission'
export { Need } from './lib/need'
export const utils = {
  parseNeed: needLib.parseNeed
}
