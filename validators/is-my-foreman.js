const { camelize } = require('casing')
const db = require('../config/db')
const { $ } = require('../db-models')
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

module.exports = function isMyForeman (argsGetter) {
  return async function (root, args, context, info, next) {
    let { id, companyId } = argsGetter(args, context)
    let [foreman] = await db($.foreman_2_company$)
      .where({ [$.foreman_2_company.foreman_id]: id, [$.foreman_2_company.company_id]: companyId })
      .then(camelize)
    if (!foreman) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `forman ${ERROR_MESSAGES.NOT_BELONG_TO.en} current company`,
          message_cn: `云工长${ERROR_MESSAGES.NOT_BELONG_TO.cn}当前装企`
        }
      }
      return
    }

    context.foreman = foreman
    await next()
  }
}
