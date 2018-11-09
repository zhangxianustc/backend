const taskSymbol = Symbol('task')
const { getOrder } = require('./order-exists')
const getProjectPlan = require('../util/get-project-plan')
const { ERROR_CODES: { INVALID_ARGUMENTS }, ERROR_MESSAGES } = require('../config/errors')
const db = require('../config/db')
const { $ } = require('../db-models')
const { camelize } = require('casing')

const taskExists = function (argGetter) {
  return async function taskExists (root, args, context, info, next) {
    let { canonicalName } = argGetter(args)
    let order = getOrder(context)
    let project = await getProjectPlan(order, context)
    for (let taskProgress of await db($.task_progress$).where({
      order_id: order.id
    }).then(camelize)) {
      project.$(taskProgress.canonicalName.split('.'), task => {
        for (let k of [ 'startAt', 'startArg', 'finishAt', 'finishArg' ]) {
          taskProgress[k] && task[k](taskProgress[k])
        }
      })
    }
    let task = project.$(canonicalName)
    if (!task) {
      context.body = {
        error: {
          code: INVALID_ARGUMENTS,
          message: `${ERROR_MESSAGES.NOT_EXIST.en} task`,
          message_cn: `任务${ERROR_MESSAGES.NOT_EXIST.cn}`
        }
      }
      return
    }
    context[taskSymbol] = task
    await next()
  }
}

taskExists.getTask = ctx => ctx[taskSymbol]

module.exports = taskExists
