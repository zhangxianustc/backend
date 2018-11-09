const db = require('../config/db')
const { $ } = require('../db-models')
const { camelize } = require('casing')
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

module.exports = function supplierNameNotExists (argsGetter) {
  return async function (root, args, context, info, next) {
    let dbConn = db($.supplier$)
    const { id, name } = argsGetter(args)

    if (name) {
      dbConn.where({ name })
      id && dbConn.whereNot({ id })
      let [ supplier ] = await dbConn.then(camelize)
      if (supplier) {
        context.body = {
          error: {
            code: ERROR_CODES.INVALID_ARGUMENTS,
            message: `supplier name ${ERROR_MESSAGES.DUPLICATE.en}`,
            message_cn: `供应商名称${ERROR_MESSAGES.DUPLICATE.cn}`
          }
        }
        return
      }
    }
    await next()
  }
}
