const db = require('../config/db')
const { $ } = require('../db-models')
const { camelize } = require('casing')
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

function financialSubjectExists (argsGetter) {
  return async function (root, args, context, info, next) {
    let { id, companyId } = argsGetter(args, context)
    if (id) {
      let [ financialSubject ] = await db($.financial_subject$).where({ id }).then(camelize)
      if (!financialSubject) {
        context.body = {
          error: {
            code: ERROR_CODES.INVALID_ARGUMENTS,
            message: `${ERROR_MESSAGES.NOT_EXIST.en} financial subject`,
            message_cn: `财务科目${ERROR_MESSAGES.NOT_EXIST.cn}`
          }
        }
        return
      }
      if (companyId && Number(financialSubject.companyId) !== Number(companyId)) {
        context.body = {
          error: {
            code: ERROR_CODES.INVALID_ARGUMENTS,
            message: `financial subject ${ERROR_MESSAGES.NOT_BELONG_TO.en} current company`,
            message_cn: `财务科目${ERROR_MESSAGES.NOT_BELONG_TO.cn}当前装企`
          }
        }
        return
      }
      context[financialSubjectExists.financialSubjectSym] = financialSubject
    }

    await next()
  }
}
financialSubjectExists.financialSubjectSym = Symbol('financialSubjectSym')
financialSubjectExists.getFinancialSubject = ctx => ctx[financialSubjectExists.financialSubjectSym]
module.exports = financialSubjectExists
