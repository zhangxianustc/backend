const isEmpty = require('is-empty')
const { FSMInvalidOp } = require('./errors')

class State {
  constructor (name, instance) {
    this._name = name
    this._routes = {}
    this._onEnterCbs = []
    this._onLeaveCbs = []
  }

  name (arg) {
    if (arg !== void 0) {
      this._name = arg
      return this
    }
    if (typeof this._name === 'function') {
      return this._name.apply(this)
    }
    return this._name
  }

  label (arg) {
    if (arg !== void 0) {
      this._label = arg
      return this
    }
    if (typeof this._label === 'function') {
      return this._label.apply(this)
    }
    return this._label || this._name
  }

  routes (arg) {
    if (arg === void 0) {
      return this._routes
    }
    this._routes = arg
    return this
  }

  async transit (op, instance) {
    let ret = this._routes[op]
    if (!ret) {
      throw new FSMInvalidOp(op, this)
    }
    if (typeof ret === 'object' && typeof ret.test === 'function') {
      let test = await Promise.resolve(ret.test.apply(this, [instance]))
      if (!test) {
        throw new FSMInvalidOp(op, this)
      }
    }
    return typeof ret === 'object' ? ret.to : ret
  }

  onEnter (arg) {
    this._onEnterCbs.push(arg)
    return this
  }

  get onEnterCbs () {
    return this._onEnterCbs
  }

  onLeave (arg) {
    this._onLeaveCbs.push(arg)
    return this
  }

  get onLeaveCbs () {
    return this._onLeaveCbs
  }

  get terminated () {
    return isEmpty(this._routes)
  }

  async getOps (instance) {
    let ret = []
    for (let k in this._routes) {
      let route = this._routes[k]
      if (typeof route === 'string') {
        ret.push(k)
      }
      if (typeof route.test === 'function') {
        try {
          let b = await route.test.apply(this, [instance])
          b && ret.push(k)
        } catch (e) {
        }
      }
    }
    return ret
  }
}

module.exports = State
