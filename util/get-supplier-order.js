const { camelize, snakeize } = require('casing')
const db = require('../config/db')
const R = require('ramda')
const { $ } = require('../db-models')
const layerify = require('layerify')
const qf = require('../util/query-fields')
const { supplierOrderFsm } = require('../fsm/supplier-order-fsm')
const { supplierOrderMaterialFsm } = require('../fsm/supplier-order-material-fsm')
const { getOrder } = require('../util/get-order')
const { SUPPLIER_ORDER_OPS, SUPPLIER_ORDER_MATERIAL_STATUS, SUPPLIER_ORDER_MATERIAL_OPS } = require('../const')

async function getSupplierOrder (query, trx = db) {
  let dbConn = trx($.supplier_order$)
  dbConn.where(snakeize(query))
  let [supplierOrder] = await dbConn
    .then(camelize)
  if (supplierOrder) {
    supplierOrder.status = {
      name: supplierOrder.status,
      label: SUPPLIER_ORDER_MATERIAL_STATUS[supplierOrder.status].cn
    }
    supplierOrder.supplier = await trx($.supplier$)
      .where({ id: supplierOrder.supplierId })
      .then(it => camelize(it[0]))
    supplierOrder.companyOrder = await getOrder({ [$.order.id]: supplierOrder.companyOrderId }, trx)
    supplierOrder.supplierOrderMaterials = await trx($.supplier_order_material$)
      .join($.sku$, $.sku.id, $.supplier_order_material.sku_id)
      .join($.sku_category$, $.sku_category.id, $.sku.sku_category_id)
      .where($.supplier_order_material.supplier_order_id, supplierOrder.id)
      .select(
        $.supplier_order_material._,
        ...qf($.sku$),
        ...qf($.sku_category$, [$.sku$])
      )
      .then(R.map(layerify))
      .then(camelize)
      .then(R.map(it => {
        it.status = {
          name: it.status,
          label: SUPPLIER_ORDER_MATERIAL_STATUS[it.status].cn
        }
        return it
      }))
  }
  return supplierOrder
}

function getSupplierOrderOps (supplierOrder, context) {
  return supplierOrderFsm.createInstance(supplierOrder.status.name)
    .bundle(context)
    .ops
    .then(ops => (ops || []).map(op => ({
      name: op,
      label: SUPPLIER_ORDER_OPS[op].cn
    })))
}

async function getSupplierOrderMaterials (supplierOrderMaterialIds, trx = db) {
  if (typeof supplierOrderMaterialIds === 'string' || typeof supplierOrderMaterialIds === 'number') {
    supplierOrderMaterialIds = [Number(supplierOrderMaterialIds)]
  }
  let supplierOrderMaterials = await trx($.supplier_order_material$)
    .join($.sku$, $.sku.id, $.supplier_order_material.sku_id)
    .whereIn($.supplier_order_material.id, supplierOrderMaterialIds)
    .select(
      $.supplier_order_material._,
      ...qf($.sku$)
    )
    .then(R.map(layerify))
    .then(camelize)

  return supplierOrderMaterials
}

async function getSupplierOrderMaterialOps (supplierOrderMaterial, context) {
  return supplierOrderMaterialFsm.createInstance(supplierOrderMaterial.status.name)
    .bundle(context)
    .ops
    .then(ops => (ops || []).map(op => ({
      name: op,
      label: SUPPLIER_ORDER_MATERIAL_OPS[op].cn
    })))
}
module.exports = {
  getSupplierOrder,
  getSupplierOrderOps,
  getSupplierOrderMaterials,
  getSupplierOrderMaterialOps
}
