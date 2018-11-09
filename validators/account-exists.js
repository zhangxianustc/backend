const db = require('../config/db')
const { camelize } = require('casing')
const { $ } = require('../db-models')
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

function accountExists (argsGetter) {
  return async function (root, args, context, info, next) {
    let { id, companyId } = argsGetter(args, context)
    let [account] = await db($.account$)
      .where({ id })
      .then(camelize)
    if (!account) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `${ERROR_MESSAGES.NOT_EXIST.en} account`,
          message_cn: `账户${ERROR_MESSAGES.NOT_EXIST.cn}`
        }
      }
      return
    }
    if (companyId && Number(account.companyId) !== Number(companyId)) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `account ${ERROR_MESSAGES.NOT_BELONG_TO.en} current company`,
          message_cn: `账户${ERROR_MESSAGES.NOT_BELONG_TO.cn}当前装企`
        }
      }
      return
    }
    context[accountExists.accountSym] = account
    await next()
  }
}
accountExists.accountSym = Symbol('accountSym')
accountExists.getAccount = ctx => ctx[accountExists.accountSym]
module.exports = accountExists
