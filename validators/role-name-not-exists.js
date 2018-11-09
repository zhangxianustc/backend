const db = require('../config/db')
const { $ } = require('../db-models')
const { camelize } = require('casing')
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

function roleNameNotExists (argsGetter) {
  return async function (root, args, context, info, next) {
    const { id, name } = argsGetter(args)

    if (name) {
      let [role] = await db($.role$)
        .whereNot({ id })
        .andWhere({ name })
        .then(camelize)
      if (role) {
        context.body = {
          error: {
            code: ERROR_CODES.INVALID_ARGUMENTS,
            message: `role name ${ERROR_MESSAGES.DUPLICATE.en}`,
            message_cn: `角色名称${ERROR_MESSAGES.DUPLICATE.cn}`
          }
        }
        return
      }
    }
    await next()
  }
}
module.exports = roleNameNotExists
