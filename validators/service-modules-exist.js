const db = require('../config/db')
const R = require('ramda')
const { $ } = require('../db-models')
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

function serviceModulesExist (modulesGetter) {
  return async function (root, args, context, info, next) {
    const { modules, orderId } = modulesGetter(args)
    let moduleIds = []
    modules.map(it => {
      if (it.id) {
        moduleIds.push(it.id)
      }
    })
    let existingModules = await db($.service_module$)
      .whereIn($.service_module.id, moduleIds)
      .andWhere($.service_module.order_id, orderId)
    const existingModuleIds = existingModules.map(it => it.id)
    const diffModuleIds = R.difference(moduleIds, existingModuleIds)
    if (!R.isEmpty(diffModuleIds)) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `${ERROR_MESSAGES.NOT_EXIST.en} service module`,
          message_cn: `场景${ERROR_MESSAGES.NOT_EXIST.cn}`
        }
      }
      return
    }
    context[serviceModulesExist.serviceModuleSym] = moduleIds
    await next()
  }
}
serviceModulesExist.serviceModuleSym = Symbol('serviceModuleSym')
serviceModulesExist.getExistServiceModuleIds = ctx => ctx[serviceModulesExist.serviceModuleSym]
module.exports = serviceModulesExist
