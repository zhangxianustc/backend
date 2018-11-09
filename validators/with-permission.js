const {
  ERROR_CODES: {
    PERMISSION_DENIED
  },
  ERROR_MESSAGES
} = require('../config/errors')
const { PrincipalPermissionDenied } = require('principal-js').errors

module.exports = function (func) {
  return async function (root, args, context, info, next) {
    try {
      await func(context.auth.principal).try()
      await next()
    } catch (e) {
      if (e instanceof PrincipalPermissionDenied) {
        context.body = {
          error: {
            code: PERMISSION_DENIED,
            message: e.message,
            message_cn: ERROR_MESSAGES.PERMISSION_DENIED.cn
          }
        }
      } else {
        throw e
      }
    }
  }
}
