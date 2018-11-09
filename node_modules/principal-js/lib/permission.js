import { PrincipalPermissionDenied } from './errors'
import * as needLib from './need'

class BasePermission {
  constructor (prinicpal) {
    this._principal = prinicpal
  }

  get principal () {
    return this._principal
  }

  or (permissions) {
    permissions = [].concat(permissions)
    let { principal } = this
    permissions = permissions.map(permission => {
      if (typeof permission === 'string') {
        permission = principal.assureNeed(permission)
      }
      if (permission instanceof needLib.Need) {
        permission = new AtomPermission(principal, permission)
      }
      return permission
    })
    for (let permission of permissions) {
      if (permission.principal !== principal) {
        throw new Error('you can only and permission with the same principal')
      }
    }
    return new OrCompoundPermission(this._principal, [this, ...permissions])
  }

  and (permissions) {
    permissions = [].concat(permissions)
    let { principal } = this
    permissions = permissions.map(permission => {
      if (typeof permission === 'string') {
        permission = principal.assureNeed(permission)
      }
      if (permission instanceof needLib.Need) {
        permission = new AtomPermission(principal, permission)
      }
      return permission
    })
    for (let permission of permissions) {
      if (permission.principal !== principal) {
        throw new Error('you can only and permission with the same principal')
      }
    }
    return new AndCompoundPermission(this.principal, [this, ...permissions])
  }

  can (args) {
    return this.try(args)
      .then(() => true)
      .catch(err => {
        if (err instanceof PrincipalPermissionDenied) {
          return false
        }
        throw err
      })
  }
}

function elaboratePermissionDeniedReason (permission, originalError) {
  // AndCompoundPermission.try will throw PrincipalPermissionDenied which permission type
  // is either OrCompoundPermission or AtomPermission
  if (permission instanceof AtomPermission) {
    let s = permission.need.toString()
    if (originalError) {
      s += '(' + originalError.message + ')'
    }
    return s
  } else if (permission instanceof OrCompoundPermission) {
    return permission.children.map((it, idx) => elaboratePermissionDeniedReason(it, originalError[idx])).join(' or ')
  }
}

export class AtomPermission extends BasePermission {
  constructor (principal, need) {
    super(principal)
    this._need = this._principal.assureNeed(need)
  }

  get need () {
    return this._need
  }

  get handlers () {
    return this._principal.getNeedHandlers(this._need)
  }

  async try (args) {
    args = args && args[this._need]
    let ok = false
    let originalError
    for (let need of this._principal.scope) {
      ok = needLib.resolve(need).pass(this._need)
      // arguments must be provided and principal has no higher need
      if (ok &&
        need.toString() === this._need.toString() &&
        this.handlers.length
      ) {
        for (let handler of this.handlers) {
          try {
            ok = await Promise.resolve(
              handler.apply(this._principal, [args])
            )
          } catch (e) {
            originalError = e
            ok = false
          }
          if (!ok) {
            break
          }
        }
      }
      if (ok) {
        break
      }
    }
    if (!ok) {
      throw new PrincipalPermissionDenied(
        elaboratePermissionDeniedReason(this, originalError),
        this,
        originalError
      )
    }
  }

  getDetail (originalError) {
    let s = this.need.toString()
    if (originalError) {
      s += '(' + originalError.message + ')'
    }
    return s
  }
}

export const Permission = AtomPermission

export class AndCompoundPermission extends BasePermission {
  constructor (principal, permissions) {
    super(principal)
    if (permissions.length < 2) {
      throw new Error('you must provide at least 2 permissions to or-operand')
    }
    for (let permission of permissions) {
      if (permission.principal !== principal) {
        throw new Error('you must "and" permissions with the same principal')
      }
    }
    this._permissions = permissions
  }

  get children () {
    return this._permissions
  }

  async try (args) {
    for (let permission of this._permissions) {
      await permission.try(args)
    }
  }

  async test (args) {
    let passed = []
    let failed = []

    for (let permission of this._permissions) {
      if (await permission.can(args)) {
        passed.push(permission)
      } else {
        failed.push(permission)
      }
    }

    return { passed, failed }
  }
}

export class OrCompoundPermission extends BasePermission {
  constructor (principal, permissions) {
    super(principal)
    this._permissions = permissions
    if (permissions.length < 2) {
      throw new Error('you must provide at least 2 permissions to or-operand')
    }
    for (let i = 0; i < permissions.length; ++i) {
      if (permissions[i].principal !== principal) {
        throw new Error('all permission must be with the same principal')
      }
    }
  }

  async try (args) {
    let ok = false
    let permissions = []
    let originalError = []
    for (let i = 0; i < this._permissions.length; ++i) {
      let permission = this._permissions[i]
      try {
        await permission.try(args)
        ok = true
      } catch (e) {
        if (e instanceof PrincipalPermissionDenied) {
          permissions.push(e.permission)
          originalError[i] = e.originalError
        } else {
          throw e
        }
      }
      if (ok) {
        break
      }
    }
    if (!ok) {
      let permission = new OrCompoundPermission(this._principal, permissions)
      throw new PrincipalPermissionDenied(
        elaboratePermissionDeniedReason(permission, originalError),
        permission,
        originalError)
    }
  }

  get children () {
    return this._permissions
  }
}

export function createPermission (principal, needs, op = 'and') {
  needs = [].concat(needs)
  if (!needs || !needs.length) {
    throw new Error('please provide needs to create permission')
  }
  if (needs.length === 1) {
    return new AtomPermission(principal, needs[0])
  }
  return new ({
    and: AndCompoundPermission,
    or: OrCompoundPermission
  }[op])(principal, needs.map(it => new AtomPermission(principal, it)))
}
