const db = require('../config/db')
const { $ } = require('../db-models')
const { camelize } = require('casing')
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

function roleExists (argsGetter) {
  return async function (root, args, context, info, next) {
    const { id, companyId } = argsGetter(args, context)

    let [role] = await db($.role$).where({ id }).then(camelize)
    if (!role) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `${ERROR_MESSAGES.NOT_EXIST.en} role`,
          message_cn: `角色${ERROR_MESSAGES.NOT_EXIST.cn}`
        }
      }
      return
    }
    if (companyId && Number(role.companyId) !== Number(companyId)) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `role ${ERROR_MESSAGES.NOT_BELONG_TO.en} current company`,
          message_cn: `角色${ERROR_MESSAGES.NOT_BELONG_TO.cn}当前装企`
        }
      }
      return
    }
    context[roleExists.roleSym] = role
    await next()
  }
}
roleExists.roleSym = Symbol('roleSym')
roleExists.getRole = ctx => ctx[roleExists.roleSym]
module.exports = roleExists
