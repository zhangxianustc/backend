const db = require('../config/db')
const { $ } = require('../db-models')
const { camelize } = require('casing')
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

module.exports = function materialExists (argsGetter) {
  return async function (root, args, context, info, next) {
    const id = argsGetter(args)
    let [ material ] = await db($.material$).where({ id }).then(camelize)
    if (!material) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `${ERROR_MESSAGES.NOT_EXIST.en} material`,
          message_cn: `材料${ERROR_MESSAGES.NOT_EXIST.cn}`
        }
      }
      return
    }
    context.material = material
    await next()
  }
}
