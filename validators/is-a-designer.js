const { camelize } = require('casing')
const db = require('../config/db')
const { $ } = require('../db-models')
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

module.exports = function isADesigner (argsGetter) {
  return async function (root, args, context, info, next) {
    let { id, companyId } = argsGetter(args, context)
    let [designer] = await db($.account$)
      .where({ id })
      .then(camelize)
    if (Number(designer.companyId) !== Number(companyId)) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `designer ${ERROR_MESSAGES.NOT_BELONG_TO.en} current company`,
          message_cn: `设计师${ERROR_MESSAGES.NOT_BELONG_TO.cn}当前装企`
        }
      }
      return
    }
    let roles = await db($.role$)
      .join($.account_2_role$, $.account_2_role.role_id, $.role.id)
      .where($.account_2_role.account_id, designer.id)
      .then(camelize)

    if (!roles.length || !roles.some(({ name }) => name === 'designer')) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `account ${ERROR_MESSAGES.NOT_BELONG_TO.en} designer`,
          message_cn: `当前账户${ERROR_MESSAGES.NOT_BELONG_TO.cn}设计师`
        }
      }
      return
    }
    context.designer = designer
    await next()
  }
}
