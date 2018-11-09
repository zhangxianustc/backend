import { PrincipalInvalidDecoration } from './errors'
import resolveAction from './resolve-action'
import decorationsPass from './decorations-pass'
import util from 'util'

const ACTION_PROP = Symbol('action')
const OBJECT_PROP = Symbol('object')
const DECORATIONS_PROP = Symbol('decoration')
const PRINCIPAL_PROP = Symbol('principal')

export function resolve (need) {
  return new NeedResolver(need)
}

class NeedResolver {
  constructor (need) {
    this._need = need
  }

  get action () {
    return this._need[ACTION_PROP]
  }

  get object () {
    return this._need[OBJECT_PROP]
  }

  get decorations () {
    return this._need[DECORATIONS_PROP]
  }

  pass (...needs) {
    if (Array.isArray(needs[0])) {
      needs = needs[0]
    }
    let pass = true
    for (let target of needs) {
      target = resolve(target)
      pass = pass &&
        resolveAction(this.action).pass(target.action) &&
        this.object.name === target.object.name &&
        decorationsPass(this.decorations, target.decorations)

      if (!pass) {
        break
      }
    }
    return pass
  }

  toJson () {
    return {
      action: resolveAction(this.action).toJson(),
      object: this.object,
      decorations: this.decorations
    }
  }

  get label () {
    let action = this._need[ACTION_PROP]
    let object = this._need[OBJECT_PROP]
    let decorations = this._need[DECORATIONS_PROP]
    return this._need[PRINCIPAL_PROP].getNeedLabel({
      action: resolveAction(action).label,
      object: object.label,
      decorations: decorations && decorations.length ? decorations.map(it => it.label) : []
    })
  }
}

export class Need {
  constructor ({ action, object, decorations }, principal) {
    if (object === 'toString') {
      throw new Error('object can\'t be "toString"')
    }
    if (~(decorations || []).indexOf('toString')) {
      throw new Error('decoration can\'t be "toString"')
    }
    this[ACTION_PROP] = action
    this[OBJECT_PROP] = object
    this[DECORATIONS_PROP] = decorations
    this[PRINCIPAL_PROP] = principal
  }

  [util.inspect.custom] () {
    return this.toString()
  }

  toString () {
    let action = this[ACTION_PROP]
    let object = this[OBJECT_PROP]
    let decorations = this[DECORATIONS_PROP]
    return [
      resolveAction(action).name,
      object.name,
      decorations && decorations.length ? decorations.map(it => it.name).join('.') : ''
    ].filter(it => it).join('.')
  }
}

export function createNeed ({
  action, object, decorations
}, principal) {
  let need = new Need({ action, object, decorations }, principal)

  return new Proxy(
    need,
    {
      get (obj, prop) {
        if (prop in obj) {
          return obj[prop]
        }
        // bypass wellknown symbols like Symbol.iterator
        if (typeof prop === 'symbol') {
          return obj[prop]
        }
        let decoration = principal._decorations[prop]
        if (decoration) {
          return createNeed({
            action: obj[ACTION_PROP],
            object: obj[OBJECT_PROP],
            decorations: (obj[DECORATIONS_PROP] || []).concat(decoration)
          }, principal)
        }
        throw new PrincipalInvalidDecoration('invalid decoration ' + prop.toString())
      }
    }
  )
}

export function parseNeed (s) {
  let m = s.match(/([^.]+)\.([^.]+)\.?(.+)?/)
  if (!m) {
    throw new Error('bad need format, should like <action>.<object>.[decorations]')
  }
  let [, action, object, decorations] = m
  decorations = decorations ? decorations.split('.') : []
  return {
    action, object, decorations
  }
}
