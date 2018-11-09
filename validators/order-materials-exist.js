const db = require('../config/db')
const R = require('ramda')
const { $ } = require('../db-models')
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

module.exports = function materialsExist (materialIdsGetter) {
  // Make sure selected Order Materials exist
  return async function (root, args, context, info, next) {
    let selectedMaterialIds = materialIdsGetter(args)

    let existingMaterialIds = await db($.order_material$)
      .whereIn($.order_material.id, selectedMaterialIds)
      .select($.order_material.id)
      .then(R.map(it => it.id))
    const diffOrderMaterialIds = R.difference(selectedMaterialIds, existingMaterialIds)
    if (!R.isEmpty(diffOrderMaterialIds)) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `${ERROR_MESSAGES.NOT_EXIST.en} order material`,
          message_cn: `订单材料${ERROR_MESSAGES.NOT_EXIST.cn}`,
          locations: [{
            field: 'companyOrderMaterialId',
            reason: 'no such OrderMaterial id: ' + diffOrderMaterialIds
          }]
        }
      }
      return
    }
    context.orderMaterialIds = existingMaterialIds
    await next()
  }
}
