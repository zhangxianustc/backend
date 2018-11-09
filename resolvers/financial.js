const { camelize, snakeize } = require('casing')
const R = require('ramda')
const layerify = require('layerify')
const db = require('../config/db')
const { $ } = require('../db-models')
const qf = require('../util/query-fields')
const orderExists = require('../validators/order-exists')
const financialSubjectExists = require('../validators/financial-subject-exists')
const financialStatementExists = require('../validators/financial-statement-exists')

const {
  BALANCE_CATEGORIES
} = require('../const')

exports.addFinancialSubject = async function (root, args) {
  let [financialSubject] = await db($.financial_subject$)
    .insert(snakeize(args))
    .returning('*')
    .then(camelize)
  return { financialSubject }
}

exports.editFinancialSubject = async function (root, { id, input }) {
  let [financialSubject] = await db($.financial_subject$)
    .where({ id })
    .update(snakeize(input))
    .returning('*')
    .then(camelize)
  return { financialSubject }
}

exports.removeFinancialSubject = async function (root, { id }) {
  const count = await db($.financial_subject$)
    .where({ id })
    .del()

  return { count }
}

exports.financialSubjectList = function (root, { companyId }) {
  let dbConn = db($.financial_subject$)
  companyId && dbConn.where({ company_id: companyId })
  return dbConn.then(camelize)
}

async function getFinancialStatement (id, trx = db) {
  let [financialStatement] = await trx($.financial_statement$)
    .join($.financial_subject$, $.financial_subject.id, $.financial_statement.financial_subject_id)
    .join($.account$ + ' as creator', 'creator.id', $.financial_statement.creator_id)
    .where($.financial_statement.id, id)
    .select(
      $.financial_statement._,
      ...qf($.financial_subject$),
      ...qf($.account$, [], 'creator')
    )
    .then(R.map(layerify))
    .then(camelize)
  return financialStatement
}

async function updateOrderTotalAmount (orderId, total, trx = db) {
  return trx($.order$)
    .where({ id: orderId })
    .update({ total })
}

exports.addFinancialStatement = async function (root, { input }, context) {
  input.creatorId = context.auth.account.id
  let financialSubject = financialSubjectExists.getFinancialSubject(context)
  return db.transaction(async function (trx) {
    let [financialStatementId] = await trx($.financial_statement$)
      .insert(snakeize(input))
      .returning($.financial_statement.id)
    if (financialSubject.balanceCategory === BALANCE_CATEGORIES.INCOME) {
      let order = orderExists.getOrder(context)
      // 更新Order.total字段
      input.amount > 0 && await updateOrderTotalAmount(input.orderId, order.total + input.amount, trx)
    }
    let financialStatement = await getFinancialStatement(financialStatementId, trx)
    return { financialStatement }
  })
}

// 更新收支记录
exports.editFinancialStatement = async function (root, { id, input }, context) {
  let currentFinancialSubject = financialSubjectExists.getFinancialSubject(context)
  let previousFinancialStatement = financialStatementExists.getFinancialStatement(context)
  let order = orderExists.getOrder(context)
  let currentOrderTotal = 0
  if (currentFinancialSubject.balanceCategory === BALANCE_CATEGORIES.INCOME) {
    if (previousFinancialStatement.financialSubject.balanceCategory === BALANCE_CATEGORIES.INCOME) {
      currentOrderTotal = order.total - previousFinancialStatement.amount + input.amount
    } else {
      currentOrderTotal = order.total + input.amount
    }
  } else if (previousFinancialStatement.financialSubject.balanceCategory === BALANCE_CATEGORIES.INCOME) {
    currentOrderTotal = order.total - previousFinancialStatement.amount
  }
  return db.transaction(async function (trx) {
    await db($.financial_statement$)
      .where({ id })
      .update(snakeize(input))
    if (currentOrderTotal !== order.total) {
      // 更新Order.total字段
      await updateOrderTotalAmount(input.orderId, currentOrderTotal, trx)
    }
    let financialStatement = await getFinancialStatement(id)
    return { financialStatement }
  })
}

exports.removeFinancialStatement = async function (root, { id }, context) {
  let previousFinancialStatement = financialStatementExists.getFinancialStatement(context)
  let order = orderExists.getOrder(context)
  let currentOrderTotal = 0
  if (previousFinancialStatement.financialSubject.balanceCategory === BALANCE_CATEGORIES.INCOME) {
    currentOrderTotal = order.total - previousFinancialStatement.amount
  }
  return db.transaction(async function (trx) {
    const count = await db($.financial_statement$)
      .where({ id })
      .del()
    if (currentOrderTotal !== order.total) {
      // 更新Order.total字段
      await updateOrderTotalAmount(order.id, currentOrderTotal, trx)
    }
    return { count }
  })
}
