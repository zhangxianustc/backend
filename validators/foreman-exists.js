const db = require('../config/db')
const { $ } = require('../db-models')
const { camelize } = require('casing')
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

module.exports = function foremanExists (argsGetter) {
  return async function (root, args, context, info, next) {
    const id = argsGetter(args)
    let [ foreman ] = await db($.foreman$).where({ id }).then(camelize)
    if (!foreman) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `${ERROR_MESSAGES.NOT_EXIST.en} foreman`,
          message_cn: `云工长${ERROR_MESSAGES.NOT_EXIST.cn}`
        }
      }
      return
    }
    context.foreman = foreman
    await next()
  }
}
