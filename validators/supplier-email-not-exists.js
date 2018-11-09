const db = require('../config/db')
const { $ } = require('../db-models')
const { camelize } = require('casing')
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

module.exports = function supplierEmailNotExists (argsGetter) {
  return async function (root, args, context, info, next) {
    let dbConn = db($.supplier$)
    const { id, email } = argsGetter(args)

    if (email) {
      dbConn.where({ email })
      id && dbConn.whereNot({ id })
      let [ supplier ] = await dbConn.then(camelize)
      if (supplier) {
        context.body = {
          error: {
            code: ERROR_CODES.INVALID_ARGUMENTS,
            message: `supplier email ${ERROR_MESSAGES.DUPLICATE.en}`,
            message_cn: `供应商邮箱${ERROR_MESSAGES.DUPLICATE.cn}`
          }
        }
        return
      }
    }
    await next()
  }
}
