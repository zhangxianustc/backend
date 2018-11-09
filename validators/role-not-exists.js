const db = require('../config/db')
const { $ } = require('../db-models')
const { camelize } = require('casing')
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

module.exports = function roleNotExists (argsGetter) {
  return async function (root, args, context, info, next) {
    const { name, companyId } = argsGetter(args, context)

    let [ role ] = await db($.role$)
      .where({ name, company_id: companyId })
      .then(camelize)
    if (role) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `role ${ERROR_MESSAGES.DUPLICATE.en}`,
          message_cn: `角色${ERROR_MESSAGES.DUPLICATE.cn}`
        }
      }
      return
    }

    await next()
  }
}
