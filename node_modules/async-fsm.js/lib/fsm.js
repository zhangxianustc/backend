const { FSMUnknownState } = require('./errors')
const isEmpty = require('is-empty')
const State = require('./state')

class Fsm {
  constructor () {
    this._states = {}
  }

  get states () {
    return this._states
  }

  addState (state, isStartState = false) {
    if (typeof state === 'function') {
      let stateObj = new State()
      state.apply(this, [stateObj])
      state = stateObj
    } else if (typeof state === 'string') {
      state = new State(state)
    }
    this._states[state.name()] = state
    if (isStartState) {
      if (isEmpty(state.routes())) {
        throw new Error('start state must have routes')
      }
      this._startState = state
    }
    return this
  }

  get startState () {
    return this._startState
  }

  createInstance (stateName) {
    if (stateName === void 0) {
      stateName = this.startState.name()
    }
    return new FsmInstance(this, stateName)
  }

  getState (stateName) {
    return this._states[stateName]
  }
}

class FsmInstance {
  constructor (fsm, stateName) {
    this._fsm = fsm
    if (!this.states.hasOwnProperty(stateName)) {
      throw new FSMUnknownState(stateName)
    }
    this._stateName = stateName
  }

  /**
   * set or get the bundle of fsm
   * @param {*} arg
   */
  bundle (arg) {
    if (arg !== void 0) {
      if (typeof arg === 'function') {
        arg = arg.apply(this, [this._bundle])
      }
      this._bundle = arg
      return this
    }
    return this._bundle
  }

  get states () {
    return this._fsm.states
  }

  /**
   * set/get current state
   * @param {string} arg state name
   */
  get state () {
    return this.states[this._stateName]
  }

  get terminated () {
    return this.states[this._stateName].terminated
  }

  async perform (op, args) {
    if (!this._stateName) {
      throw new Error('Fsm has no state, do you forget to set the initialize state?')
    }
    let oldStateName = this._stateName
    this._stateName = await this.states[this._stateName].transit(op, this)
    if (!this.states.hasOwnProperty(this._stateName)) {
      throw new FSMUnknownState(this._stateName)
    }
    let onLeaveCbs = this.states[oldStateName].onLeaveCbs
    if (!isEmpty(onLeaveCbs)) {
      for (let cb of onLeaveCbs) {
        await cb.apply(this, [{
          from: oldStateName,
          to: this._stateName,
          ...(args ? { args } : {})
        }])
      }
    }

    let state = this.states[this._stateName]
    let onEnterCbs = state.onEnterCbs
    if (!isEmpty(onEnterCbs)) {
      for (let cb of onEnterCbs) {
        await cb.apply(this, [{
          from: oldStateName,
          to: this._stateName,
          ...(args ? { args } : {})
        }])
      }
    }
    return this
  }

  get ops () {
    if (!this._stateName) {
      throw new Error('Fsm has no state, do you forget to set the initialize state?')
    }
    return this.states[this._stateName].getOps(this)
  }

  get relevantStates () {
    let instance = this
    return (async function () {
      let operableStateSet = new Set()
      let reachableStateSet = new Set()
      for (let state of Object.values(instance.states)) {
        let operable = false
        for (let op in state._routes) {
          let nextState = state._routes[op]
          let reachable = typeof nextState === 'string' ||
            await Promise.resolve(nextState.test.apply(state, [instance]))
          if (reachable) {
            reachableStateSet.add(typeof nextState === 'string' ? nextState : nextState.to)
          }
          operable = operable || reachable
        }
        operable && operableStateSet.add(state.name())
      }
      return {
        operable: Array.from(operableStateSet),
        reachable: Array.from(reachableStateSet)
      }
    })()
  }
}

module.exports = Fsm
