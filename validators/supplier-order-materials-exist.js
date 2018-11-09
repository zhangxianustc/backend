const db = require('../config/db')
const R = require('ramda')
const { $ } = require('../db-models')
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

function supplierOrderMaterialsExist (argsGetter) {
  return async function (root, args, context, info, next) {
    let { supplierOrderMaterialIds } = argsGetter(args, context)
    if (typeof supplierOrderMaterialIds === 'string' || typeof supplierOrderMaterialIds === 'number') {
      supplierOrderMaterialIds = [Number(supplierOrderMaterialIds)]
    }
    let existingSupplierOrderMaterials = await db($.supplier_order_material$)
      .whereIn($.supplier_order_material.id, supplierOrderMaterialIds)
      // .then(R.map(it => it.id))
    const existingSupplierOrderMaterialIds = existingSupplierOrderMaterials.map(it => it.id)
    const diffSupplierOrderMaterialIds = R.difference(supplierOrderMaterialIds, existingSupplierOrderMaterialIds)
    if (!R.isEmpty(diffSupplierOrderMaterialIds)) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `${ERROR_MESSAGES.NOT_EXIST.en} supplier order material`,
          message_cn: `供应商订单材料${ERROR_MESSAGES.NOT_EXIST.cn}`
        }
      }
      return
    }

    context[supplierOrderMaterialsExist.supplierOrderMaterialsSym] = existingSupplierOrderMaterials
    await next()
  }
}
supplierOrderMaterialsExist.supplierOrderMaterialsSym = Symbol('supplierOrderMaterialsSym')
supplierOrderMaterialsExist.getSupplierOrderMaterials = ctx => ctx[supplierOrderMaterialsExist.supplierOrderMaterialsSym]
module.exports = supplierOrderMaterialsExist
