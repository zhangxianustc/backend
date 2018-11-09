const db = require('../config/db')
const { $ } = require('../db-models')
const { camelize } = require('casing')
const R = require('ramda')
const layerify = require('layerify')
const queryFields = require('../util/query-fields')
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

function financialStatementExists (argsGetter) {
  return async function (root, args, context, info, next) {
    const id = argsGetter(args)
    let [ financialStatement ] = await db($.financial_statement$)
      .join($.financial_subject$, $.financial_subject.id, $.financial_statement.financial_subject_id)
      .where($.financial_statement.id, id)
      .select(
        $.financial_statement._,
        ...queryFields($.financial_subject$)
      )
      .then(R.map(layerify))
      .then(camelize)
    if (!financialStatement) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `${ERROR_MESSAGES.NOT_EXIST.en} financia statement`,
          message_cn: `财务收支${ERROR_MESSAGES.NOT_EXIST.cn}`
        }
      }
      return
    }
    context[financialStatementExists.financialStatementSym] = financialStatement
    await next()
  }
}
financialStatementExists.financialStatementSym = Symbol('financialStatementSym')
financialStatementExists.getFinancialStatement = ctx => ctx[financialStatementExists.financialStatementSym]
module.exports = financialStatementExists
