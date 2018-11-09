const db = require('../config/db')
const R = require('ramda')
const { $ } = require('../db-models')
const { SUPPLIER_ORDER_MATERIAL_STATUS } = require('../const')
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

// Make sure Service Module names for the same Order are unique
module.exports = function modulesDup (modulesGetter) {
  return async function (root, args, context, info, next) {
    const { modules, orderId } = modulesGetter(args)
    // 仅检查没有提供id的modules
    const moduleNames = []
    modules.map(it => {
      if (!it.id) {
        moduleNames.push(it.name)
      }
    })
    if (R.uniq(moduleNames).length < moduleNames.length) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `service module names ${ERROR_MESSAGES.DUPLICATE.en}`,
          message_cn: `场景名称${ERROR_MESSAGES.DUPLICATE.cn}`
        }
      }
      return
    }

    let dupModules = await db($.service_module$)
      .join($.order_material$, $.order_material.module_id, $.service_module.id)
      .whereIn($.service_module.name, moduleNames)
      .andWhere($.service_module.order_id, orderId)
      .whereNot($.order_material.status, SUPPLIER_ORDER_MATERIAL_STATUS.selected.en)
    if (!R.isEmpty(dupModules)) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `service module names ${ERROR_MESSAGES.DUPLICATE.en}`,
          message_cn: `场景名称${ERROR_MESSAGES.DUPLICATE.cn}`
        }
      }
      return
    }
    await next()
  }
}
