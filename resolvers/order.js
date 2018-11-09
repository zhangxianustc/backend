const { camelize, snakeize } = require('casing')
const R = require('ramda')
const { underscored } = require('underscore.string.fp')
const layerify = require('layerify')
const db = require('../config/db')
const { $ } = require('../db-models')
const {
  BUITIN_FINANCIAL_INCOME_SUBJECTS,
  BALANCE_CATEGORIES,
  SUPPLIER_ORDER_MATERIAL_STATUS,
  ORDER_MODULE_TYPES
} = require('../const')
const modelColumns = require('../util/model-columns')
const queryFields = require('../util/query-fields')
const { orderFsm, OPS } = require('../fsm/order-fsm')
const { appointmentFsm, OPS: APPOINTMENT_OPS } = require('../fsm/appointment-fsm')
const oapply = require('oapply')
const { FSMInvalidOp } = require('async-fsm.js')
const { getOrder, getOrderOps } = require('../util/get-order')
const baseGetter = require('../util/base-getter')
const orderExists = require('../validators/order-exists')
const getProjectPlan = require('../util/get-project-plan')
const { normalizeTask } = require('./task')
const appointmentExists = require('../validators/appointment-exists')
const { ERROR_CODES: { INVALID_ARGUMENTS }, ERROR_MESSAGES } = require('../config/errors')
const { getSupplierOrder, getSupplierOrderOps } = require('../util/get-supplier-order')
const serviceModulesExist = require('../validators/service-modules-exist')
const { ORDER_STATUS } = require('../const')

exports.order = async (root, { id }, context) => {
  let order = await getOrder({ [$.order.id]: id })
  if (order) {
    order.ops = await getOrderOps(order, context)
  }
  return order
}

exports.orderStatusList = async (root, arg, context) => {
  let { operable, reachable } = await orderFsm
    .createInstance()
    .bundle(context)
    .relevantStates

  let set = new Set()
  for (let state of operable.concat(reachable)) {
    set.add(state)
  }
  return Array.from(set).map(it => ({
    name: it,
    label: orderFsm.getState(it).label()
  }))
}

exports.addOrder = async function addOrder (root, { appointmentId, input }, context) {
  return db.transaction(async function (trx) {
    // create order
    let [order] = await trx($.order$)
      .insert(await oapply(
        R.pick(modelColumns($.order$), snakeize(input)),
        it => {
          it.status = orderFsm.startState.name()
        }
      ))
      .returning('*')
    // create room 4 order
    await trx($.room_4_order$).insert(
      (input.roomTypeCounts || [])
        .map(it => {
          it.orderId = order.id
          return it
        })
        .map(snakeize)
    )
    // convert appointment id
    if (appointmentId) {
      let appointment = appointmentExists.getAppointment(context)

      try {
        await appointmentFsm.createInstance(appointment.status)
          .bundle(context)
          .perform(APPOINTMENT_OPS.convert, { id: appointmentId, trx })
      } catch (e) {
        if (e instanceof FSMInvalidOp) {
          return {
            error: {
              code: INVALID_ARGUMENTS,
              message: e.message
            }
          }
        }
        throw e
      }
    }
    let [ financialSubject ] = await trx($.financial_subject$)
      .where({ name: BUITIN_FINANCIAL_INCOME_SUBJECTS.DEPOSIT, balance_category: BALANCE_CATEGORIES.INCOME, company_id: input.companyId })
      .then(camelize)

    // Insert deposit statement once appointment converted to order
    await trx($.financial_statement$)
      .insert(snakeize(
        {
          orderId: order.id,
          financialSubjectId: financialSubject.id,
          amount: input.deposit,
          creatorId: input.creatorId
        }
      ))

    return {
      order: await oapply(
        getOrder({
          [$.order.id]: order.id
        }, trx),
        async it => { it.ops = await getOrderOps(it, context) }
      )
    }
  })
}

exports.updateOrderBasicInfo = async (root, { id, input }, context) => {
  return db.transaction(async function (trx) {
    // update order
    let [order] = await trx($.order$)
      .where({ id })
      .update(Object.assign(R.pick(modelColumns($.order$), snakeize(input)), { update_at: trx.fn.now(6) }))
      .returning('*')
    if (input.roomTypeCounts) {
      // delete existing room types for current order
      await trx($.room_4_order$).where($.room_4_order.order_id, id).del()
      // insert new room types for this order
      await trx($.room_4_order$).insert(
        input.roomTypeCounts
          .map(it => {
            it.orderId = order.id
            return it
          })
          .map(snakeize)
      )
        .returning('*')
    }
    return {
      order: await oapply(
        getOrder({
          [$.order.id]: order.id
        }, trx),
        async it => { it.ops = await getOrderOps(it, context) }
      )
    }
  })
}

exports.orders = async function orders (root, { offset, limit, filter = {}, sortBy }, context) {
  sortBy = sortBy ? [$.order$ + '.' + underscored(sortBy.key), sortBy.order] : [$.order.id, 'DESC']
  let dbConn = db($.order$)
    .join($.company$, $.company.id, $.order.company_id)
    .join($.customer$, $.customer.id, $.order.customer_id)
    .join($.account$ + ' as salesperson', 'salesperson.id', $.order.salesperson_id)
    .leftOuterJoin($.account$ + ' as designer', 'designer.id', $.order.designer_id)
    .join($.account$ + ' as creator', 'creator.id', $.order.creator_id)
    .leftOuterJoin($.foreman$, $.foreman.id, $.order.foreman_id)

  for (let k of [
    'companyId', 'customerId', 'salespersonId', 'designerId', 'foremanId', 'status'
  ]) {
    filter[k] && dbConn.where($.order[underscored(k)], filter[k])
  }
  filter.createAtAfter && dbConn.where($.order.create_at, '>=', filter.createAtAfter)
  filter.createAtBefore && dbConn.where($.order.create_at, '<=', filter.createAtBefore + ' 23:59:59.999')
  filter.keyword && dbConn.where(function () {
    this.where($.order.seq, 'ilike', '%' + filter.keyword + '%')
      .orWhere($.customer.last_name, 'ilike', '%' + filter.keyword + '%')
  })

  let [{ count }] = await dbConn.clone().count()
  let list = await dbConn
    .select([
      $.order._,
      ...queryFields($.company$),
      ...queryFields($.account$, [], 'salesperson'),
      ...queryFields($.account$, [], 'designer'),
      ...queryFields($.customer$),
      ...queryFields($.account$, [], 'creator'),
      ...queryFields($.foreman$)
    ])
    .limit(limit)
    .offset(offset)
    .orderBy(...sortBy)
    .then(R.map(layerify))
    .then(camelize)

  let financialStatements = await db($.financial_statement$)
    .join($.financial_subject$, $.financial_subject.id, $.financial_statement.financial_subject_id)
    .join($.account$ + ' as creator', 'creator.id', $.financial_statement.creator_id)
    .whereIn($.financial_statement.order_id, R.map(it => it.id, list))
    .orderBy($.financial_statement.create_at, 'DESC')
    .select(
      $.financial_statement._,
      ...queryFields($.financial_subject$),
      ...queryFields($.account$, [], 'creator')
    )
    .then(R.map(layerify))
    .then(camelize)
    .then(R.groupBy(it => it.orderId))

  for (let order of list) {
    order.status = {
      name: order.status,
      label: ORDER_STATUS[order.status].cn
    }
    order.ops = await getOrderOps(order, context)
    order.financialStatements = Object.assign(order.financialStatements || [], financialStatements[order.id])
  }

  return { count, list }
}

exports.orderSelectMaterials = async function orderSelectMaterials (root, { id, input }, context) {
  let order = orderExists.getOrder(context)
  let materialData = snakeize(input)
  let targetMaterialModuleIds = serviceModulesExist.getExistServiceModuleIds(context)
  return db.transaction(async function (trx) {
    let existMaterialModuleIds = await trx($.service_module$)
      .join($.order_material$, $.order_material.module_id, $.service_module.id)
      .select($.service_module.id)
      .where({ order_id: id, type: ORDER_MODULE_TYPES.MATERIAL })
      .andWhere($.order_material.status, SUPPLIER_ORDER_MATERIAL_STATUS.selected.en)
      // 排除试图更新的Module
      .whereNotIn($.service_module.id, targetMaterialModuleIds)
      .groupBy($.service_module.id)

    if (existMaterialModuleIds && !R.isEmpty(existMaterialModuleIds)) {
      // Delete existing order materials
      await trx($.order_material$)
        .whereIn($.order_material.module_id, R.map(it => it.id, existMaterialModuleIds))
        .del()
    }
    if (!R.isEmpty(targetMaterialModuleIds)) {
      // 清理目标场景中处于selected状态的选材
      await trx($.order_material$)
        .whereIn($.order_material.module_id, targetMaterialModuleIds)
        .andWhere($.order_material.status, SUPPLIER_ORDER_MATERIAL_STATUS.selected.en)
        .del()
    }
    let existServiceModuleIds = await trx($.service_module$)
      .select($.service_module.id)
      .where({ order_id: id, type: ORDER_MODULE_TYPES.SERVICEFEE })
    if (existServiceModuleIds && !R.isEmpty(existServiceModuleIds)) {
      // Delete related order services
      await trx($.order_service$)
        .whereIn($.order_service.module_id, R.map(it => it.id, existServiceModuleIds))
        .del()
    }
    let existModuleIds = existMaterialModuleIds.concat(existServiceModuleIds)
    if (!R.isEmpty(existModuleIds)) {
      // Delete all existing service Modules of this Order before inserting new ones
      await trx($.service_module$)
        .whereIn($.service_module.id, R.map(it => it.id, existModuleIds))
        .del()
    }

    for (let moduleInput of materialData) {
      let moduleId = moduleInput.id || null
      if (!moduleId) {
        // Insert service modules
        const [newModuleId] = await trx($.service_module$)
          .insert(Object.assign(R.pick(['name', 'type'], moduleInput), { order_id: id }))
          .returning('id')
          .then(camelize)
        moduleId = newModuleId
      }

      let batchNo = id + '' + (new Date()).getTime()
      if (moduleInput.type === 'MATERIAL') {
        // Insert order-materials for `MATERIAL` module only
        const validSelectedMaterials = moduleInput.selected_materials

        let materials = await trx($.material$)
          .join($.brand$, $.brand.id, $.material.brand_id)
          .join($.unit$, $.unit.id, $.material.unit_id)
          .whereIn($.material.id, R.map(it => it.material_id, validSelectedMaterials))
          .select([
            $.material._,
            ...queryFields($.brand$),
            ...queryFields($.unit$)
          ])
          .then(R.map(layerify))
          .then(camelize)
        const materialsMap = R.zipObj(R.map(it => it.id, materials), materials)
        let orderMaterialsData = R.map(
          materialInput => {
            const materialDetail = materialsMap[materialInput.material_id]
            return {
              batch_no: batchNo,
              module_id: moduleId,
              material_id: materialDetail.id,
              name: materialDetail.name,
              brand: materialDetail.brand.name,
              supplier_id: materialDetail.supplierId,
              sku_id: materialDetail.skuId,
              quantity: materialInput.quantity,
              unit: materialDetail.unit.name,
              sale_price: materialDetail.salePrice,
              purchase_price: materialDetail.purchasePrice,
              currency: materialDetail.currency,
              supply_cycle_in_days: materialDetail.supplyCycleInDays
            }
          },
          validSelectedMaterials)
        !R.isEmpty(orderMaterialsData) && await trx($.order_material$).insert(orderMaterialsData)
      } else if (moduleInput.type === 'SERVICEFEE') {
        moduleInput.selected_services.map(it => {
          it.batch_no = batchNo
          it.module_id = moduleId
        })
        // Insert order-services
        await trx($.order_service$).insert(moduleInput.selected_services)
      }
    }
    // 仅SaaS账户可以改变状态
    if (context.auth.account) {
      await orderFsm.createInstance(order.status)
        .bundle(context)
        .perform(OPS.select_service_items, { id, trx })
    }

    return {
      order: await oapply(
        getOrder({
          [$.order.id]: id
        }, trx),
        async it => { it.ops = await getOrderOps(it, context) }
      )
    }
  })
}

exports.selectDesigner = async function (root, { id, designerId }, context, info) {
  let order = orderExists.getOrder(context)
  await orderFsm.createInstance(order.status)
    .bundle(context)
    .perform(OPS.select_designer, {
      id,
      designerId
    })
  return {
    order: await oapply(
      getOrder({
        [$.order.id]: id
      }),
      async it => { it.ops = await getOrderOps(it, context) }
    )
  }
}

exports.orderSignContract = async function (root, { id, input }, context, info) {
  let order = orderExists.getOrder(context)
  let paymentScheme = snakeize(input)

  await orderFsm.createInstance(order.status)
    .bundle(context)
    .perform(OPS.sign, {
      id,
      paymentScheme
    })
  return {
    order: await oapply(
      getOrder({
        [$.order.id]: id
      }),
      async it => { it.ops = await getOrderOps(it, context) }
    )
  }
}

exports.orderSelectForeman = async function (root, { id, foremanId, estimatedStartDate }, context, info) {
  let order = orderExists.getOrder(context)
  await orderFsm.createInstance(order.status)
    .bundle(context)
    .perform(OPS.select_foreman, {
      id,
      foremanId,
      estimatedStartDate
    })
  return {
    order: await oapply(
      getOrder({
        [$.order.id]: id
      }),
      async it => { it.ops = await getOrderOps(it, context) }
    )
  }
}

exports.orderPayDownPayment = async function (root, { id, downPaymentReceiptUrls }, context, info) {
  let order = orderExists.getOrder(context)
  return db.transaction(async function (trx) {
    let [ financialSubject ] = await trx($.financial_subject$)
      .where({ name: BUITIN_FINANCIAL_INCOME_SUBJECTS.DOWN_PAYMENT, balance_category: BALANCE_CATEGORIES.INCOME, company_id: order.companyId })
      .then(camelize)

    // Insert statement
    await trx($.financial_statement$)
      .insert(snakeize(
        {
          orderId: order.id,
          financialSubjectId: financialSubject.id,
          amount: order.downPaymentAmount,
          creatorId: context.auth.account.id
        }
      ))
    await orderFsm.createInstance(order.status)
      .bundle(context)
      .perform(OPS.pay_down_payment, {
        id,
        downPaymentReceiptUrls,
        trx
      })
    return {
      order: await oapply(
        getOrder({
          [$.order.id]: id
        }, trx),
        async it => { it.ops = await getOrderOps(it, context) }
      )
    }
  })
}

exports.abortOrder = async function (root, { id }, context) {
  let order = orderExists.getOrder(context)
  await orderFsm.createInstance(order.status)
    .bundle(context)
    .perform(OPS.abort, { id })

  return {
    order: await oapply(
      getOrder({
        [$.order.id]: id
      }),
      async it => { it.ops = await getOrderOps(it, context) }
    )
  }
}

exports.foremanHandleOrder = async function (root, { id, action = 'accept' }, context, info) {
  let order = orderExists.getOrder(context)
  await orderFsm.createInstance(order.status)
    .bundle(context)
    .perform(OPS[underscored(action)], { id })
  return {
    order: await oapply(
      getOrder({
        [$.order.id]: id
      }),
      async it => { it.ops = await getOrderOps(it, context) }
    )
  }
}

exports.customerEvaluateOrder = async function (root, { id, input }, context, info) {
  let order = orderExists.getOrder(context)
  await orderFsm.createInstance(order.status)
    .bundle(context)
    .perform(OPS.evaluate, { id, evaluations: snakeize(input), context })
  return {
    order: await oapply(
      getOrder({
        [$.order.id]: id
      }),
      async it => { it.ops = await getOrderOps(it, context) }
    )
  }
}

exports.orderFeedbackTypeList = () => baseGetter.get('order_feedback_type_list')

exports.addOrderFeedback = async (root, arg, context) => {
  let [ feedback ] = await db('order_feedback')
    .insert(snakeize(Object.assign(arg, {
      creatorId: context.auth.customer.id
    })))
    .returning('*')
    .then(camelize)
  feedback.creator = await db('customer')
    .where({ id: feedback.creatorId })
    .then(it => camelize(it[0]))
  return {
    feedback
  }
}

const roomTypesValidator = async function (root, args, context, info, next) {
  let { input: { roomTypeCounts, companyId } } = args
  for (let { typeId } of roomTypeCounts || []) {
    let [roomType] = await db($.room_type$)
      .where({
        id: typeId,
        company_id: companyId
      })
      .returning('*')
      .then(camelize)

    if (!roomType) {
      context.body = {
        error: {
          code: INVALID_ARGUMENTS,
          message: `${ERROR_MESSAGES.NOT_EXIST.en} room type`,
          message_cn: `房间类型${ERROR_MESSAGES.NOT_EXIST.cn}`
        }
      }
      return
    }
  }
  await next()
}

exports.validators = {
  roomTypesValidator
}

exports.resolverMap = {
  Order: {
    async project (order, root, context) {
      let project = await getProjectPlan(order, context)
      project.base(order.estimatedStartDate)
      for (let taskProgress of await db($.task_progress$).where({
        order_id: order.id
      }).then(camelize)) {
        project.$(taskProgress.canonicalName.split('.'), task => {
          for (let k of [ 'startAt', 'startArg', 'finishAt', 'finishArg' ]) {
            taskProgress[k] && task[k](taskProgress[k])
          }
        })
      }
      return normalizeTask(project.toJSON(), project.baseline)
    },
    async projectJSON (order, root, context) {
      let project = await getProjectPlan(order, context)
      project.base(order.estimatedStartDate)
      for (let taskProgress of await db($.task_progress$).where({
        order_id: order.id
      }).then(camelize)) {
        project.$(taskProgress.canonicalName.split('.'), task => {
          for (let k of [ 'startAt', 'startArg', 'finishAt', 'finishArg' ]) {
            taskProgress[k] && task[k](taskProgress[k])
          }
        })
      }
      return project.toJSON()
    },
    async serviceModules (order) {
      // Get detail for service modules
      let materialItems = await db($.order_material$)
        .leftJoin($.service_module$, { [$.service_module.id]: $.order_material.module_id })
        .leftJoin($.sku$, { [$.sku.id]: $.order_material.sku_id })
        .leftJoin($.supplier$, { [$.supplier.id]: $.order_material.supplier_id })
        .select(
          ...queryFields($.service_module$),
          ...queryFields($.order_material$, [$.service_module$]),
          ...queryFields($.sku$, [$.service_module$, $.order_material$]),
          ...queryFields($.supplier$, [$.service_module$, $.order_material$])
        )
        .where($.service_module.order_id, order.id)
        .then(R.map(layerify))
        .then(camelize)
      let serviceModules = R.values(R.groupBy(it => it.serviceModule.id, materialItems))
        .map(_materialItems => {
          let serviceModule = _materialItems[0].serviceModule
          let orderMaterials
          if (serviceModule.type === 'MATERIAL') {
            orderMaterials = _materialItems.map(R.path(['serviceModule', 'orderMaterial']))
              .map(it => {
                it.status = {
                  name: it.status,
                  label: SUPPLIER_ORDER_MATERIAL_STATUS[it.status].cn
                }
                return it
              })
          }
          return Object.assign({}, serviceModule, { orderMaterials })
        })

      let serviceItems = await db($.order_service$)
        .leftJoin($.service_module$, { [$.service_module.id]: $.order_service.module_id })
        .select(
          ...queryFields($.service_module$),
          ...queryFields($.order_service$, [$.service_module$])
        )
        .where($.service_module.order_id, order.id)
        .then(R.map(layerify))
        .then(camelize)

      serviceModules = serviceModules.concat(
        R.values(R.groupBy(it => it.serviceModule.id, serviceItems))
          .map(_serviceItems => {
            let serviceModule = _serviceItems[0].serviceModule
            let orderServices
            if (serviceModule.type === 'SERVICEFEE') {
              orderServices = _serviceItems.map(R.path(['serviceModule', 'orderService']))
            }
            return Object.assign({}, serviceModule, { orderServices })
          })
      )
      return serviceModules
    },

    async supplierOrders (order, root, context) {
      let supplierOrderIds = await db($.supplier_order$)
        .where($.supplier_order.company_order_id, order.id)
        .select('id')
        .then(camelize)
      let supplierOrders = []
      for (let supplierOrderId of supplierOrderIds) {
        let supplierOrder = await getSupplierOrder({ id: supplierOrderId.id })
        supplierOrder.ops = await getSupplierOrderOps(supplierOrder, context)
        supplierOrders.push(supplierOrder)
      }
      return supplierOrders
    },

    async orderLogs (order, root, context) {
      let orderLogs = await db($.order_log$)
        .where($.order_log.order_id, order.id)
        .then(camelize)
      return orderLogs
    }
  }
}
