const { Fsm } = require('async-fsm.js')
const assureOwnProperty = require('../util/assure-own-property')
const db = require('../config/db')
const { $ } = require('../db-models')
const { SUPPLIER_ORDER_MATERIAL_STATUS, SUPPLIER_ORDER_OPS } = require('../const')

const STATES = assureOwnProperty({
  // 装企已下单
  ordered: 'ordered',
  // 供应商已确认
  confirmed: 'confirmed',
  // 装企已取消
  cancelled: 'cancelled'
})

let supplierOrderOpsMap = {}
Object.keys(SUPPLIER_ORDER_OPS).map(key => {
  supplierOrderOpsMap[key] = SUPPLIER_ORDER_OPS[key].en
})
const supplierOPS = assureOwnProperty(supplierOrderOpsMap)

const orderedState = state => state
  .name(STATES.ordered)
  .label(SUPPLIER_ORDER_MATERIAL_STATUS.ordered.cn)
  .routes(
    {
      [supplierOPS.confirm]: {
        to: STATES.confirmed,
        test (instance) {
          // Todo: supplier principals
          return true
        }
      },
      [supplierOPS.cancel]: {
        to: STATES.cancelled,
        test (instance) {
          let { auth: { principal } } = instance.bundle()
          return principal.can('cancel.supplier_order.assignedToMe')
        }
      }
    })

const confirmedState = state => state
  .name(STATES.confirmed)
  .label(SUPPLIER_ORDER_MATERIAL_STATUS.confirmed.cn)
  .onEnter(function ({ args: { supplierOrderId, trx = db } }) {
    return trx.transaction(async (tranx) => {
      await tranx($.supplier_order$)
        .where($.supplier_order.id, supplierOrderId)
        .update({
          status: this.state.name()
        })
      let orderMaterialIds = await tranx($.supplier_order_material$)
        .where($.supplier_order_material.supplier_order_id, supplierOrderId)
        .update({
          status: this.state.name()
        })
        .returning($.supplier_order_material.company_order_material_id)
      // 同步状态至OrderMaterial
      await tranx($.order_material$)
        .whereIn($.order_material.id, orderMaterialIds)
        .update({
          status: this.state.name()
        })
    })
  })

const cancelledState = state => state
  .name(STATES.cancelled)
  .label(SUPPLIER_ORDER_MATERIAL_STATUS.cancelled.cn)
  .onEnter(function ({ args: { supplierOrderId, trx = db } }) {
    return trx.transaction(async (tranx) => {
      await tranx($.supplier_order$)
        .where($.supplier_order.id, supplierOrderId)
        .update({
          status: this.state.name()
        })

      let orderMaterialIds = await tranx($.supplier_order_material$)
        .where($.supplier_order_material.supplier_order_id, supplierOrderId)
        .update({
          status: this.state.name()
        })
        .returning($.supplier_order_material.company_order_material_id)

      // 同步状态至OrderMaterial
      await tranx($.order_material$)
        .whereIn($.order_material.id, orderMaterialIds)
        .update({
          status: this.state.name()
        })
    })
  })
const supplierOrderFsm = new Fsm()
  .addState(orderedState, true)
  .addState(confirmedState)
  .addState(cancelledState)

module.exports = {
  STATES, supplierOPS, supplierOrderFsm
}
