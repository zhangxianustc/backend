const db = require('../config/db')
const { $ } = require('../db-models')
const { camelize } = require('casing')
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

module.exports = function customerExists (idGetter) {
  return async function (root, args, context, info, next) {
    let [ customer ] = await db($.customer$)
      .where({ id: idGetter(args) })
      .then(camelize)
    if (!customer) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `${ERROR_MESSAGES.NOT_EXIST.en} customer`,
          message_cn: `客户${ERROR_MESSAGES.NOT_EXIST.cn}`,
          locations: [{
            field: 'customerId',
            reason: 'no such customer'
          }]
        }
      }
      return
    }
    context.customer = customer
    await next()
  }
}
