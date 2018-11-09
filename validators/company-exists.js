const db = require('../config/db')
const { $ } = require('../db-models')
const { camelize } = require('casing')
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

function companyExists (idGetter) {
  return async function (root, args, context, info, next) {
    let [ company ] = await db($.company$)
      .where({ id: idGetter(args) })
      .then(camelize)
    if (!company) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `${ERROR_MESSAGES.NOT_EXIST.en} company`,
          message_cn: `装企${ERROR_MESSAGES.NOT_EXIST.cn}`
        }
      }
      return
    }
    context[companyExists.companySym] = company
    await next()
  }
}
companyExists.companySym = Symbol('companySym')
companyExists.getCompany = ctx => ctx[companyExists.companySym]
module.exports = companyExists
