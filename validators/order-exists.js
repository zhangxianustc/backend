const db = require('../config/db')
const { $ } = require('../db-models')
const { camelize } = require('casing')
const R = require('ramda')
const qf = require('../util/query-fields')
const layerify = require('layerify')
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

function orderExists (argsGetter) {
  return async function (root, args, context, info, next) {
    let { id, companyId, customerId, foremanId } = argsGetter(args, context)

    let [ order ] = await db($.order$)
      .join($.company$, $.company.id, $.order.company_id)
      .leftJoin($.foreman$, $.foreman.id, $.order.foreman_id)
      .where($.order.id, id)
      .select([
        $.order._,
        ...qf($.company$),
        ...qf($.foreman$)
      ])
      .then(R.map(layerify))
      .then(camelize)
    if (!order) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `${ERROR_MESSAGES.NOT_EXIST.en} order`,
          message_cn: `订单${ERROR_MESSAGES.NOT_EXIST.cn}`
        }
      }
      return
    }
    if (companyId && Number(order.companyId) !== Number(companyId)) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `order ${ERROR_MESSAGES.NOT_BELONG_TO.en} current company`,
          message_cn: `订单${ERROR_MESSAGES.NOT_BELONG_TO.cn}当前装企`
        }
      }
      return
    }
    if (customerId && Number(order.customerId) !== Number(customerId)) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `order ${ERROR_MESSAGES.NOT_BELONG_TO.en} current customer`,
          message_cn: `订单${ERROR_MESSAGES.NOT_BELONG_TO.cn}当前业主`
        }
      }
      return
    }
    if (foremanId && Number(order.foremanId) !== Number(foremanId)) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `order ${ERROR_MESSAGES.NOT_BELONG_TO.en} current foreman`,
          message_cn: `订单${ERROR_MESSAGES.NOT_BELONG_TO.cn}当前云工长`
        }
      }
      return
    }
    context[orderExists.orderSym] = order

    await next()
  }
}
orderExists.orderSym = Symbol('orderSym')
orderExists.getOrder = ctx => ctx[orderExists.orderSym]
module.exports = orderExists
