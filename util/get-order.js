const R = require('ramda')
const { camelize } = require('casing')
const layerify = require('layerify')
const db = require('../config/db')
const { $ } = require('../db-models')
const queryFields = require('../util/query-fields')
const { orderFsm } = require('../fsm/order-fsm')
const { ORDER_STATUS, ORDER_OPS } = require('../const')

exports.getOrder = async function getOrder (query, trx = db) {
  let [order] = await trx($.order$)
    .join($.company$, $.company.id, $.order.company_id)
    .join($.customer$, $.customer.id, $.order.customer_id)
    .join($.account$ + ' as salesperson', 'salesperson.id', $.order.salesperson_id)
    .leftOuterJoin($.account$ + ' as designer', 'designer.id', $.order.designer_id)
    .join($.account$ + ' as creator', 'creator.id', $.order.creator_id)
    .leftOuterJoin($.foreman$, $.foreman.id, $.order.foreman_id)
    .select(
      $.order._,
      ...queryFields($.company$),
      ...queryFields($.account$, [], 'salesperson'),
      ...queryFields($.account$, [], 'designer'),
      ...queryFields($.customer$),
      ...queryFields($.account$, [], 'creator'),
      ...queryFields($.foreman$)
    )
    .where(query)
    .then(R.map(layerify))
    .then(camelize)

  if (order) {
    order.status = {
      name: order.status,
      label: ORDER_STATUS[order.status].cn
    }
    order.roomTypeCounts = await trx($.room_4_order$)
      .join($.room_type$ + ' as type', 'type.id', $.room_4_order.type_id)
      .select(
        $.room_4_order._,
        ...queryFields($.room_type$, [], 'type')
      )
      .where($.room_4_order.order_id, order.id)
      .then(R.map(layerify))
      .then(camelize)

    order.orderEvaluation = await trx($.order_evaluation$)
      .where({ order_id: order.id })
      .orderBy($.order_evaluation.create_at, 'DESC')
      .then(rs => camelize(rs[0]))
    order.financialStatements = await trx($.financial_statement$)
      .join($.financial_subject$, $.financial_subject.id, $.financial_statement.financial_subject_id)
      .join($.account$ + ' as creator', 'creator.id', $.financial_statement.creator_id)
      .where({ order_id: order.id })
      .orderBy($.financial_statement.create_at, 'DESC')
      .select(
        $.financial_statement._,
        ...queryFields($.financial_subject$),
        ...queryFields($.account$, [], 'creator')
      )
      .then(R.map(layerify))
      .then(camelize)
  }
  return order
}

exports.getOrderOps = function (order, context) {
  return orderFsm.createInstance(order.status.name)
    .bundle(context)
    .ops
    .then(ops => (ops || []).map(op => ({
      name: op,
      label: ORDER_OPS[op].cn
    })))
}
