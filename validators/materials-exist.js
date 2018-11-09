const db = require('../config/db')
const R = require('ramda')
const { $ } = require('../db-models')
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

module.exports = function materialsExist (materialsGetter) {
  // Make sure selected materials exist
  return async function (root, args, context, info, next) {
    let selectedMaterials = materialsGetter(args)
    const selectedMaterialIds = R.map(it => it.materialId, selectedMaterials)

    let existingMaterialIds = await db($.material$)
      .whereIn($.material.id, selectedMaterialIds)
      .select($.material.id)
      .then(R.map(it => it.id))
    const diffMaterialIds = R.difference(selectedMaterialIds, existingMaterialIds)
    if (!R.isEmpty(diffMaterialIds)) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `${ERROR_MESSAGES.NOT_EXIST.en} material`,
          message_cn: `材料${ERROR_MESSAGES.NOT_EXIST.cn}`,
          locations: [{
            field: 'materialId',
            reason: 'no such material id: ' + diffMaterialIds
          }]
        }
      }
      return
    }
    context.materialIds = existingMaterialIds
    await next()
  }
}
