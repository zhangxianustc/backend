const baseGetter = require('../util/base-getter')
const { ERROR_CODES: { INVALID_ARGUMENTS }, ERROR_MESSAGES } = require('../config/errors')

function appFeedbackTypeExists (valueGatter) {
  var appFeedbackTypeList
  return async function (root, args, context, info, next) {
    let type = valueGatter(args)
    if (!appFeedbackTypeList) {
      appFeedbackTypeList = await baseGetter.get('app_feedback_type_list')
    }
    if (appFeedbackTypeList.indexOf(type) === -1) {
      context.body = {
        error: {
          code: INVALID_ARGUMENTS,
          message: `${ERROR_MESSAGES.NOT_EXIST.en} app feedback type`,
          message_cn: `反馈类型${ERROR_MESSAGES.NOT_EXIST.cn}`
        }
      }
      return
    }
    context[appFeedbackTypeExists.appFeedbackType] = type
    await next()
  }
}

appFeedbackTypeExists.appFeedbackType = Symbol('appFeedbackType')

module.exports = appFeedbackTypeExists
