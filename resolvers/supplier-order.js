const { camelize, snakeize } = require('casing')
const db = require('../config/db')
const R = require('ramda')
const { $ } = require('../db-models')
const { supplierOrderFsm, supplierOPS } = require('../fsm/supplier-order-fsm')
const { supplierOrderMaterialFsm, supplierOrderMaterialOPS } = require('../fsm/supplier-order-material-fsm')
const { sendEmail } = require('../util/send-email')
const oapply = require('oapply')
const orderExists = require('../validators/order-exists')
const supplierOrderExists = require('../validators/supplier-order-exists')
const supplierOrderMaterialsExist = require('../validators/supplier-order-materials-exist')
const { ERROR_CODES: { INVALID_ARGUMENTS, INVALID_OP }, ERROR_MESSAGES } = require('../config/errors')
const { getSupplierOrder, getSupplierOrderOps, getSupplierOrderMaterials, getSupplierOrderMaterialOps } = require('../util/get-supplier-order')
const { ORDER_STATUS } = require('../const')

// 装企下单/编辑订单
exports.makeSupplierOrder = async (root, { orderId, supplierId, batchNo, lang = 'cn', memo, input }, context) => {
  const order = orderExists.getOrder(context)
  if (!R.contains(order.status, [
    ORDER_STATUS.selecting_foreman.en,
    ORDER_STATUS.waiting_for_foreman.en,
    ORDER_STATUS.constructing.en
  ])) {
    return {
      error: {
        code: INVALID_OP,
        message: ERROR_MESSAGES.CANNOT_MAKE_SUPPLIER_ORDER.en,
        message_cn: ERROR_MESSAGES.CANNOT_MAKE_SUPPLIER_ORDER.cn
      }
    }
  }
  return db.transaction(async function (trx) {
    let supplierOrderDbConn = trx($.supplier_order$)
      .where({ company_order_id: orderId, supplier_id: supplierId, batch_no: batchNo })
    let [previousSupplierOrder] = await supplierOrderDbConn.clone()
      .select($.supplier_order.seq)
    // 清除旧的(当前批次)Supplier Order及其相关Materials
    await supplierOrderDbConn.del()
    let supplierOrderData = {
      supplier_id: supplierId,
      company_id: order.companyId,
      company_order_id: orderId,
      batch_no: batchNo,
      status: supplierOrderFsm.startState.name(),
      memo
    }
    // 如果是编辑，则沿用旧的seq
    previousSupplierOrder && (supplierOrderData.seq = previousSupplierOrder.seq)
    let [newSupplierOrder] = await trx($.supplier_order$)
      .insert(supplierOrderData)
      .returning([$.supplier_order.id, $.supplier_order.seq])
      .then(camelize)
    let supplierOrderMaterialData = snakeize(input.map(it => {
      it.supplier_order_id = newSupplierOrder.id
      it.status = supplierOrderFsm.startState.name()
      return it
    }))
    await trx($.supplier_order_material$)
      .insert(supplierOrderMaterialData)

    // 下单后同步更新OrderMaterial的status
    await trx($.order_material$)
      .where({ batch_no: batchNo, supplier_id: supplierId })
      .update({
        status: supplierOrderFsm.startState.name()
      })

    let supplierOrder = await oapply(
      getSupplierOrder({ id: newSupplierOrder.id }, trx),
      async it => { it.ops = await getSupplierOrderOps(it, context) }
    )

    // 发送邮件通知供应商
    await sendEmail({
      template: previousSupplierOrder ? lang + '_edit_supplier_order' : lang + '_new_supplier_order',
      recipient: context.supplier.email,
      locals: {
        company_name: supplierOrder.companyOrder.company.name,
        company_phone: supplierOrder.companyOrder.company.phone,
        supplier_order_seq: supplierOrder.seq,
        supplier_order_url: process.env.SAAS_FRONTEND_HOST + supplierOrder.seq
      }
    })
      .then(res => { return { recipients: res.accepted, messageId: res.messageId } })
      .catch(err => {
        if (err.message === 'No recipients defined') {
          return {
            error: {
              code: INVALID_ARGUMENTS,
              message: ERROR_MESSAGES.INVALID_EMAIL_ADDRESS.en,
              message_cn: ERROR_MESSAGES.INVALID_EMAIL_ADDRESS.cn
            }
          }
        } else {
          return err
        }
      })
    return { supplierOrder }
  })
}

// 供应商确认材料订单
exports.confirmSupplierOrder = async (root, { supplierOrderId }, context) => {
  await supplierOrderFsm.createInstance(supplierOrderExists.getSupplierOrder(context).status)
    .bundle(context)
    .perform(supplierOPS.confirm, {
      supplierOrderId
    })
  return {
    supplierOrder: await oapply(
      getSupplierOrder({ id: supplierOrderId }),
      async it => {
        it.ops = await getSupplierOrderOps(it, context)
      }
    )
  }
}

// 供应商发货
exports.shipSupplierOrderMaterial = async (root, { supplierOrderMaterialId }, context) => {
  let supplierOrderMaterials = supplierOrderMaterialsExist.getSupplierOrderMaterials(context)
  await supplierOrderMaterialFsm.createInstance(supplierOrderMaterials[0].status)
    .bundle(context)
    .perform(supplierOrderMaterialOPS.ship, {
      supplierOrderMaterialId
    })
  return {
    supplierOrderMaterial: await oapply(
      (await getSupplierOrderMaterials([supplierOrderMaterialId]))[0],
      async it => { it.ops = await getSupplierOrderMaterialOps(it, context) }
    )
  }
}

// 云工长验收材料
exports.acceptSupplierOrderMaterials = async (root, { supplierOrderMaterialIds }, context) => {
  let supplierOrderMaterials = supplierOrderMaterialsExist.getSupplierOrderMaterials(context)
  for (let supplierOrderMaterial of supplierOrderMaterials) {
    await supplierOrderMaterialFsm.createInstance(supplierOrderMaterial.status)
      .bundle(context)
      .perform(supplierOrderMaterialOPS.accept, {
        supplierOrderMaterialId: supplierOrderMaterial.id
      })
  }

  return {
    supplierOrderMaterials: await oapply(
      getSupplierOrderMaterials(supplierOrderMaterialIds),
      R.map(async it => { it.ops = await getSupplierOrderMaterialOps(it, context) })
    )
  }
}

// 装企取消下单
exports.cancelSupplierOrder = async (root, { supplierOrderId, lang = 'cn' }, context) => {
  let supplierOrder = supplierOrderExists.getSupplierOrder(context)
  await supplierOrderFsm.createInstance(supplierOrder.status)
    .bundle(context)
    .perform(supplierOPS.cancel, {
      supplierOrderId
    })

  supplierOrder = await oapply(
    getSupplierOrder({ [$.supplier_order.id]: supplierOrderId }),
    async it => { it.ops = await getSupplierOrderOps(it, context) }
  )

  // 发送邮件通知供应商
  await sendEmail({
    template: lang + '_cancel_supplier_order',
    recipient: supplierOrder.supplier.email,
    locals: {
      company_name: supplierOrder.companyOrder.company.name,
      company_phone: supplierOrder.companyOrder.company.phone,
      supplier_order_seq: supplierOrder.seq,
      supplier_order_url: process.env.SAAS_FRONTEND_HOST + supplierOrder.seq
    }
  })
    .then(res => { return { recipients: res.accepted, messageId: res.messageId } })
    .catch(err => {
      if (err.message === 'No recipients defined') {
        return {
          error: {
            code: INVALID_ARGUMENTS,
            message: ERROR_MESSAGES.INVALID_EMAIL_ADDRESS.en,
            message_cn: ERROR_MESSAGES.INVALID_EMAIL_ADDRESS.cn
          }
        }
      } else {
        return err
      }
    })

  return { supplierOrder }
}

exports.supplierOrder = async (root, query, context) => {
  let supplierOrder = await getSupplierOrder(query)
  if (supplierOrder) {
    supplierOrder.ops = await getSupplierOrderOps(supplierOrder, context)
  }
  return supplierOrder
}
