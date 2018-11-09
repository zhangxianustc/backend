const db = require('../config/db')
const { $ } = require('../db-models')
const { camelize } = require('casing')
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

module.exports = function (idGetter) {
  return async function (root, args, context, info, next) {
    const [ salesperson ] = await db($.account_2_role$)
      .join($.role$, { [$.account_2_role.role_id]: $.role.id })
      .where({
        [$.account_2_role.account_id]: idGetter(args),
        [$.role.name]: 'salesperson'
      })
      .then(camelize)

    if (!salesperson) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `${ERROR_MESSAGES.NOT_EXIST.en} salesperson`,
          message_cn: `销售${ERROR_MESSAGES.NOT_EXIST.cn}`,
          locations: [{
            field: 'salespersonId',
            reason: 'no such salesperson'
          }]
        }
      }
    }
    context.salesperson = salesperson
    await next()
  }
}
