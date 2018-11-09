const {
  ERROR_CODES: {
    UNAUTHENTICATED,
    PERMISSION_DENIED
  },
  ERROR_MESSAGES
} = require('../config/errors')
const { PrincipalPermissionDenied } = require('principal-js').errors
const invokeNextChain = require('invoke-next-chain')

function guard (...funcs) {
  funcs[funcs.length - 1] = (function (realResolver) {
    return function (root, args, context, info) {
      return Promise.resolve(realResolver(root, args, context, info))
        .then(rsp => {
          context.body = rsp
        })
    }
  })(funcs[funcs.length - 1])
  for (let i = 0; i < funcs.length; ++i) {
    if (typeof funcs[i] === 'string') {
      funcs[i] = [funcs[i]]
    }
    // is needs
    if (Array.isArray(funcs[i])) {
      funcs[i] = (function (needs) {
        return async function (root, args, context, info, next) {
          try {
            await context.auth.principal.try(needs)
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
      })(funcs[i].slice(0)) // clone array
    }
  }
  funcs = [loginRequired].concat(funcs)
  return function (root, args, context, info) {
    return invokeNextChain(root, args, context, info)(funcs)
      .then(() => {
        // console.log(context.body)
        return context.body
      })
  }
}

/**
 * load use from http header 'authorization'
 */
async function loginRequired (root, args, context, info, next) {
  if (!context.auth) {
    let err = new Error('unauthenticated')
    err.code = UNAUTHENTICATED
    throw err
  } else if (context.auth.err) {
    throw context.auth.err
  }
  await next()
}

module.exports = guard
