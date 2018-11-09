const db = require('../config/db')
const { camelize } = require('casing')
const { $ } = require('../db-models')
const { STATES } = require('../fsm/supplier-order-fsm')
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

module.exports = function canEditOrderMaterials (argsGetter) {
  return async function (root, args, context, info, next) {
    let { orderId, batchNo } = argsGetter(args)
    if (batchNo) {
      let [supplierOrder] = await db($.supplier_order$)
        .where($.supplier_order.company_order_id, orderId)
        .andWhere($.supplier_order.batch_no, batchNo)
        .then(camelize)
      if (supplierOrder && supplierOrder.status !== STATES.ordered) {
        context.body = {
          error: {
            code: ERROR_CODES.INVALID_ARGUMENTS,
            message: `OrderMaterial ${ERROR_MESSAGES.CAN_NOT_BE_EDITED.en}`,
            message_cn: `订单材料${ERROR_MESSAGES.CAN_NOT_BE_EDITED.cn}`
          }
        }
        return
      }
      context.supplierOrder = supplierOrder
    }
    await next()
  }
}
