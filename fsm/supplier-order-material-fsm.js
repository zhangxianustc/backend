const { Fsm } = require('async-fsm.js')
const assureOwnProperty = require('../util/assure-own-property')
const db = require('../config/db')
const { $ } = require('../db-models')
const { SUPPLIER_ORDER_MATERIAL_STATUS, SUPPLIER_ORDER_MATERIAL_OPS } = require('../const')

const STATES = assureOwnProperty({
  // 装企已下单
  ordered: 'ordered',
  // 供应商已确认
  confirmed: 'confirmed',
  // 供应商已发货
  shipped: 'shipped',
  // 云工长已验收
  accepted: 'accepted',
  // 装企已取消
  cancelled: 'cancelled'
})

let supplierOrderMaterialOpsMap = {}
Object.keys(SUPPLIER_ORDER_MATERIAL_OPS).map(key => {
  supplierOrderMaterialOpsMap[key] = SUPPLIER_ORDER_MATERIAL_OPS[key].en
})
const supplierOrderMaterialOPS = assureOwnProperty(supplierOrderMaterialOpsMap)

const confirmedState = state => state
  .name(STATES.confirmed)
  .label(SUPPLIER_ORDER_MATERIAL_STATUS.confirmed.cn)
  .routes(
    {
      [supplierOrderMaterialOPS.ship]: {
        to: STATES.shipped,
        test (instance) {
          // Todo: supplier principals
          return true
        }
      }
    })

const shippedState = state => state
  .name(STATES.shipped)
  .label(SUPPLIER_ORDER_MATERIAL_STATUS.shipped.cn)
  .routes(
    {
      [supplierOrderMaterialOPS.accept]: {
        to: STATES.accepted,
        test (instance) {
          let { auth: { principal } } = instance.bundle()
          return principal.can('accept.supplier_order_material.assignedToMe')
        }
      }
    })
  .onEnter(function ({ args: { supplierOrderMaterialId, trx = db } }) {
    return trx.transaction(async (tranx) => {
      let [orderMaterialId] = await tranx($.supplier_order_material$)
        .where($.supplier_order_material.id, supplierOrderMaterialId)
        .update({
          status: this.state.name(),
          ship_at: tranx.fn.now(6)
        })
        .returning($.supplier_order_material.company_order_material_id)

      // 同步状态至OrderMaterial
      await tranx($.order_material$)
        .where($.order_material.id, orderMaterialId)
        .update({
          status: this.state.name(),
          ship_at: tranx.fn.now(6)
        })
    })
  })

const acceptedState = state => state
  .name(STATES.accepted)
  .label(SUPPLIER_ORDER_MATERIAL_STATUS.accepted.cn)
  .onEnter(function ({ args: { supplierOrderMaterialId, trx = db } }) {
    return trx.transaction(async (tranx) => {
      // supplierOrderMaterialsExist.getSupplierOrderMaterials(context).trx = tranx
      let [orderMaterialId] = await tranx($.supplier_order_material$)
        .where($.supplier_order_material.id, supplierOrderMaterialId)
        .update({
          status: this.state.name(),
          accept_at: tranx.fn.now(6)
        })
        .returning($.supplier_order_material.company_order_material_id)

      // 同步状态至OrderMaterial
      await tranx($.order_material$)
        .where($.order_material.id, orderMaterialId)
        .update({
          status: this.state.name(),
          accept_at: tranx.fn.now(6)
        })
    })
  })

const supplierOrderMaterialFsm = new Fsm()
  .addState(confirmedState, true)
  .addState(state => state
    .name(STATES.ordered)
    .label(SUPPLIER_ORDER_MATERIAL_STATUS.ordered.cn))
  .addState(shippedState)
  .addState(acceptedState)
  .addState(state => state
    .name(STATES.cancelled)
    .label(SUPPLIER_ORDER_MATERIAL_STATUS[STATES.cancelled].cn))

module.exports = {
  STATES, supplierOrderMaterialOPS, supplierOrderMaterialFsm
}
