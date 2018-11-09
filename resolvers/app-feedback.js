const { camelize, snakeize } = require('casing')
const db = require('../config/db')
const { $ } = require('../db-models')
const baseGetter = require('../util/base-getter')
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

const validateRole = async function validateRole (root, { role }, context, info, next) {
  if (role !== 'customer' && role !== 'foreman') {
    context.body = {
      error: {
        code: ERROR_CODES.INVALID_ARGUMENTS,
        message: `role ${ERROR_MESSAGES.MUST_BE.en} customer or foreman`,
        message_cn: `角色${ERROR_MESSAGES.MUST_BE.cn}业主或云工长`
      }
    }
    return
  }
  context[validateRole.roleArg] = role
  await next()
}

validateRole.roleArg = Symbol('role')
exports.validateRole = validateRole

exports.appFeedbackTypeList = () => baseGetter.get('app_feedback_type_list')

exports.addAppFeedback = async function (root, args, context, info) {
  let [feedback] = await db($.app_feedback$)
    .insert(snakeize(Object.assign(args, {
      creatorId: (context.auth.customer || context.auth.foreman).id
    })))
    .returning('*')
    .then(camelize)

  feedback.creator = await db($[args.role + '$'])
    .where({ id: feedback.creatorId })
    .then(it => camelize(it[0]))

  return { feedback }
}
