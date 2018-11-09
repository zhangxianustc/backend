const db = require('../config/db')
const { $ } = require('../db-models')
const { camelize } = require('casing')
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

module.exports = function financialSubjectDup (argsGetter) {
  return async function (root, args, context, info, next) {
    const { id, name, companyId } = argsGetter(args, context)
    let dbConn = db($.financial_subject$).where({ name, company_id: companyId })
    id && dbConn.whereNot({ id })
    let [ financialSubject ] = await dbConn.then(camelize)
    if (financialSubject) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `financial subject name ${ERROR_MESSAGES.DUPLICATE.en}`,
          message_cn: `财务科目名称${ERROR_MESSAGES.NOT_EXIST.cn}`
        }
      }
      return
    }
    context.financialSubject = financialSubject
    await next()
  }
}
