const db = require('../config/db')
const { $ } = require('../db-models')
const { snakeize } = require('casing')

const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

function orderLogExists (argsGetter) {
  return async function (root, args, context, info, next) {
    let logData = snakeize(argsGetter(args, context))
    let trx = context.trx || db
    let dupLog = await trx($.order_log$)
      .where(logData)
    if (dupLog.length > 0) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `Order log ${ERROR_MESSAGES.DUPLICATE.en}`,
          message_cn: `施工日志${ERROR_MESSAGES.DUPLICATE.cn}`
        }
      }
      return
    }
    context[orderLogExists.orderLogSym] = logData
    await next()
  }
}
orderLogExists.orderLogSym = Symbol('orderLogSym')

orderLogExists.getOrderLog = ctx => ctx[orderLogExists.orderLogSym]
module.exports = orderLogExists
