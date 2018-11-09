const db = require('../config/db')
const R = require('ramda')
const { $ } = require('../db-models')
const { camelize } = require('casing')
const layerify = require('layerify')
const qf = require('../util/query-fields')
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

function supplierOrderExists (argsGetter) {
  return async function (root, args, context, info, next) {
    const { supplierOrderId, companyId, supplierId } = argsGetter(args, context)
    let [ supplierOrder ] = await db($.supplier_order$)
      .join($.supplier$, $.supplier.id, $.supplier_order.supplier_id)
      .where($.supplier_order.id, supplierOrderId)
      .select(
        $.supplier_order._,
        ...qf($.supplier$)
      )
      .then(R.map(layerify))
      .then(camelize)
    if (!supplierOrder) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `${ERROR_MESSAGES.NOT_EXIST.en} supplier order`,
          message_cn: `供应商订单${ERROR_MESSAGES.NOT_EXIST.cn}`
        }
      }
      return
    }
    if (companyId && Number(supplierOrder.companyId) !== Number(companyId)) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `supplier order ${ERROR_MESSAGES.NOT_BELONG_TO.en} current company`,
          message_cn: `供应商订单${ERROR_MESSAGES.NOT_BELONG_TO.cn}当前装企`
        }
      }
      return
    }
    if (supplierId && Number(supplierOrder.supplierId) !== Number(supplierId)) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `supplier order ${ERROR_MESSAGES.NOT_BELONG_TO.en} current supplier`,
          message_cn: `供应商订单${ERROR_MESSAGES.NOT_BELONG_TO.cn}当前供应商`
        }
      }
      return
    }

    context[supplierOrderExists.supplierOrderSym] = supplierOrder
    await next()
  }
}
supplierOrderExists.supplierOrderSym = Symbol('supplierOrderSym')
supplierOrderExists.getSupplierOrder = ctx => ctx[supplierOrderExists.supplierOrderSym]
module.exports = supplierOrderExists
