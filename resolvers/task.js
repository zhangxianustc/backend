const { Task } = require('gantt-engine')
const { $ } = require('../db-models')
const db = require('../config/db')
const { camelize } = require('casing')
const { getTask } = require('../validators/task-exists')
const { ERROR_CODES: { INVALID_OP }, ERROR_MESSAGES } = require('../config/errors')
const orderExists = require('../validators/order-exists')
const { orderFsm, OPS } = require('../fsm/order-fsm')

exports.performToTask = async (root, {
  orderId,
  canonicalName,
  op,
  arg
}, context, info) => db.transaction(async function (trx) {
  canonicalName = canonicalName.join('.')
  let task = getTask(context)
  let [tp] = await trx($.task_progress$)
    .where({
      order_id: orderId,
      canonical_name: canonicalName
    })
    .then(camelize)
  if (tp) {
    for (let k of ['startAt', 'startArg', 'finishAt', 'finishArg']) {
      tp[k] && task[k](tp[k])
    }
  }
  // 测试当前是否可以执行相关操作
  if (task.ops.indexOf(op) === -1) {
    return {
      error: {
        code: INVALID_OP,
        message: `${op} ${ERROR_MESSAGES.CANNOT_PERFORM_OP.en} ${canonicalName}`,
        message_cn: `${ERROR_MESSAGES.CANNOT_PERFORM_OP.cn}${op}`
      }
    }
  }
  if (!tp) {
    await trx($.task_progress$)
      .insert({
        order_id: orderId,
        canonical_name: canonicalName
      })
  }
  let args
  if (op === Task.OP_START) {
    args = {
      start_at: new Date(),
      start_arg: arg
    }
  } else {
    args = {
      finish_at: new Date(),
      finish_arg: arg
    }
  }
  tp = await trx($.task_progress$)
    .update(args)
    .where({
      order_id: orderId,
      canonical_name: canonicalName
    })
    .returning('*')
    .then(it => camelize(it[0]))
  let { baseline } = task.root
  args.start_at && task.startAt(args.start_at)
  args.start_arg && task.startArg(args.start_arg)
  args.finish_at && task.finishAt(args.finish_at)
  args.finish_arg && task.finishArg(args.finish_arg)
  let order = orderExists.getOrder(context)
  if (task.root.finishAt()) {
    // 如果工程全部完成，则更新订单状态为'evaluating'
    await orderFsm.createInstance(order.status)
      .bundle(context)
      .perform(OPS.accomplish, { id: orderId })
  }

  return { task: normalizeTask(task.toJSON(), baseline) }
})

exports.task = async function (root, { orderId, canonicalName }, context) {
  let task = getTask(context)
  let [tp] = await db($.task_progress$)
    .where({
      order_id: orderId,
      canonical_name: canonicalName.join('.')
    })
    .then(camelize)
  let { baseline } = task.root
  if (tp) {
    tp.startAt && task.startAt(tp.startAt)
    tp.startArg && task.startArg(tp.startArg)
    tp.finishAt && task.finishAt(tp.finishAt)
    tp.finishArg && task.finishArg(tp.finishArg)
  }
  return { task: normalizeTask(task.toJSON(), baseline) }
}

const _stuffType = function _stuffType (task) {
  task.type = task.bundle && task.bundle.type
  ;(task.subTasks || []).forEach(_stuffType)
}

function _changeToSecond (task) {
  task.expectedToStartAt = task.expectedToStartAt && Math.round(task.expectedToStartAt / 1000)
  task.startAt = task.startAt && Math.round(task.startAt / 1000)
  task.expectedTimeSpan = task.expectedTimeSpan && Math.round(task.expectedTimeSpan / 1000)
  task.finishAt = task.finishAt && Math.round(task.finishAt / 1000)
  task.expectedToFinishAt = task.expectedToFinishAt && Math.round(task.expectedToFinishAt / 1000)
  task.delayContribution = Math.round(task.delayContribution / 1000)
  task.delay = Math.round(task.delay / 1000)
  ;(task.subTasks || []).forEach(_changeToSecond)
}

function _stuffDelay (task, baseline) {
  let baselineTask = baseline.$(task.canonicalName)
  task.delayContribution = task.expectedTimeSpan - baselineTask.expectedTimeSpan()
  task.delay = task.expectedToFinishAt - baselineTask.expectedToFinishAt
  ;(task.subTasks || []).forEach(it => _stuffDelay(it, baseline))
}

function normalizeTask (task, baseline) {
  _stuffType(task)
  _stuffDelay(task, baseline)
  _changeToSecond(task)
  return task
}

exports.normalizeTask = normalizeTask
