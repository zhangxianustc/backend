const db = require('../config/db')
const { $ } = require('../db-models')
const { camelize } = require('casing')
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

module.exports = function cityExists (argsGetter) {
  return async function (root, args, context, info, next) {
    let dbConn = db($.city$)
    const { name, citycode } = argsGetter(args)

    if (name || citycode) {
      dbConn.where({ name })
        .orWhere({ citycode })
      let [ city ] = await dbConn.then(camelize)
      if (city) {
        context.body = {
          error: {
            code: ERROR_CODES.INVALID_ARGUMENTS,
            message: `city ${ERROR_MESSAGES.DUPLICATE.en}`,
            message_cn: `城市${ERROR_MESSAGES.DUPLICATE.cn}`
          }
        }
        return
      }
    }
    await next()
  }
}
