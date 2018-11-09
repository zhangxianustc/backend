const db = require('../config/db')
const { $ } = require('../db-models')
const { camelize } = require('casing')
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

module.exports = function supplierExists (argsGetter) {
  return async function (root, args, context, info, next) {
    const id = argsGetter(args)
    let [ supplier ] = await db($.supplier$).where({ id }).then(camelize)
    if (!supplier) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `${ERROR_MESSAGES.NOT_EXIST.en} supplier`,
          message_cn: `供应商${ERROR_MESSAGES.NOT_EXIST.cn}`
        }
      }
      return
    }
    context.supplier = supplier
    await next()
  }
}
