const baseGetter = require('../util/base-getter')
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

function orderFeedbackTypeExists (typeGetter) {
  return async function (root, args, context, info, next) {
    let type = typeGetter(args)
    if ((await baseGetter.get('order_feedback_type_list')).indexOf(type) === -1) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `${ERROR_MESSAGES.NOT_EXIST.en} order feedback type`,
          message_cn: `订单反馈类型${ERROR_MESSAGES.NOT_EXIST.cn}`
        }
      }
      return
    }
    context[orderFeedbackTypeExists.arg] = type
    await next()
  }
}

orderFeedbackTypeExists.arg = Symbol('order_feedback_type')

module.exports = orderFeedbackTypeExists
