const db = require('../config/db')
const { $ } = require('../db-models')
const orderLogExists = require('../validators/order-log-exists')

function logOrder (resolver) {
  return async function (root, args, context, info, next) {
    let logData = orderLogExists.getOrderLog(context)
    let ret = await resolver(root, args, context, info)
    if (!ret.error) {
      await db($.order_log$)
        .insert(logData)
    }
    return ret
  }
}

module.exports = logOrder
