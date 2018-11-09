export const NAME_PROP = Symbol('name')
export const LABEL_PROP = Symbol('label')
export const INHERIT_FROM_PROP = Symbol('inherit_from')

/**
 * this is a utility class, if you need to get properties from an Action,
 * use this resolver
 */
class ActionResolver {
  constructor (action) {
    this._action = action
  }

  get name () {
    return this._action[NAME_PROP]
  }

  get label () {
    return this._action[LABEL_PROP]
  }

  get inheritFrom () {
    return this._action[INHERIT_FROM_PROP]
  }

  _getAncestorsIter (action) {
    // clone array
    let ret = resolve(action).inheritFrom.slice(0)
    for (let parentAction of ret.slice(0)) {
      ret = ret.concat(this._getAncestorsIter(parentAction))
    }
    return ret
  }

  get ancestors () {
    return this._getAncestorsIter(this._action)
  }

  inherited (targetAction) {
    return !!~this.ancestors.map(it => resolve(it).name).indexOf(
      typeof targetAction === 'string'
        ? targetAction
        : resolve(targetAction).name
    )
  }

  pass (targetAction) {
    targetAction = resolve(targetAction)
    return this.name === targetAction.name ||
      !!~this.ancestors.map(it => resolve(it).name).indexOf(targetAction.name)
  }

  toJson () {
    return {
      name: this.name,
      label: this.label,
      inheritFrom: this.inheritFrom.map(it => resolve(it).name)
    }
  }
}

export default function resolve (action) {
  return new ActionResolver(action)
}
