export class PrincipalInvalidObject extends Error { }
export class PrincipalInvalidDecoration extends Error { }
export class PrincipalInvalidAction extends Error {}

export class PrincipalPermissionDenied extends Error {
  constructor (msg, permission, originalError) {
    super(msg)
    this.permission = permission
    this.originalError = originalError
  }
}

export default {
  PrincipalInvalidObject,
  PrincipalInvalidDecoration,
  PrincipalInvalidAction,
  PrincipalPermissionDenied
}
