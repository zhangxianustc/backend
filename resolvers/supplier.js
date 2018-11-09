const { camelize, snakeize } = require('casing')
const R = require('ramda')
const { underscored } = require('underscore.string.fp')
const db = require('../config/db')
const { $ } = require('../db-models')
const modelColumns = require('../util/model-columns')
const { ERROR_CODES: { INVALID_ARGUMENTS }, ERROR_MESSAGES } = require('../config/errors')

exports.addSupplier = async function addSupplier (root, args) {
  let supplierData = snakeize(args.input)

  let dbConn = db($.supplier$)
  let [supplier] = await dbConn
    .insert(supplierData)
    .returning('*')
    .then(camelize)
  return { supplier }
}

exports.supplierList = async function supplierList (root, { offset, limit, filter = {}, sortBy }) {
  if (filter.companyIdEqu && filter.companyIdNotEqu) {
    delete filter.companyIdEqu
    delete filter.companyIdNotEqu
  }
  sortBy = sortBy ? [underscored(sortBy.key), sortBy.order] : ['create_at', 'DESC']
  let dbConn = db($.supplier$)
    .leftJoin($.supplier_2_company$, $.supplier_2_company.supplier_id, $.supplier.id)

  filter.companyIdEqu && dbConn.where($.supplier_2_company.company_id, filter.companyIdEqu)

  filter.companyIdNotEqu && dbConn.whereNotIn(
    $.supplier.id,
    await dbConn.clone()
      .where($.supplier_2_company.company_id, filter.companyIdNotEqu)
      .select($.supplier.id)
      .then(R.map(it => it.id))
  )

  filter.createAtAfter && dbConn.where('create_at', '>=', filter.createAtAfter)
  filter.createAtBefore && dbConn.where('create_at', '<=', filter.createAtBefore + ' 23:59:59.999')
  filter.keyword && dbConn.where(function () {
    this.where('name', 'ilike', '%' + filter.keyword + '%')
  })
  let [{ count }] = await dbConn.clone().count()
  let list = await dbConn
    .limit(limit)
    .offset(offset)
    .orderBy(...sortBy)
    .then(camelize)
  return { count, list }
}

exports.bindSupplier = async function bindSupplier (root, { id, action = 'Bind' }, context) {
  let companyId = context.auth.account.company.id
  let bindData = { supplier_id: id, company_id: companyId }
  let dbConn = db($.supplier_2_company$)
  let [binding] = await dbConn.where(bindData)
  if (action === 'Bind') {
    if (binding) {
      return {
        error: {
          code: INVALID_ARGUMENTS,
          message: `Supplier ${ERROR_MESSAGES.ALREADY_BOUND.en}`,
          message_cn: `供应商${ERROR_MESSAGES.ALREADY_BOUND.cn}`
        }
      }
    }
    let [newBinding] = await dbConn.insert(bindData).returning('*').then(camelize)
    newBinding.status = 'bound'
    return newBinding
  }
  if (action === 'Unbind') {
    if (!binding) {
      return {
        error: {
          code: INVALID_ARGUMENTS,
          message: `Supplier ${ERROR_MESSAGES.NOT_BOUND.en}`,
          message_cn: `供应商${ERROR_MESSAGES.NOT_BOUND.en}`
        }
      }
    }
    await dbConn.where(bindData).del()
    return { status: 'unbound' }
  }
}

async function supplierExists (root, { id }, context, info, next) {
  let [supplier] = await db($.supplier$).where({ id })
  if (!supplier) {
    context.body = {
      error: {
        code: INVALID_ARGUMENTS,
        message: `${ERROR_MESSAGES.NOT_EXIST.en} supplier`,
        message_cn: `供应商${ERROR_MESSAGES.NOT_EXIST.cn}`
      }
    }
    return
  }
  context.supplier = supplier
  await next()
}

exports.validators = {
  supplierExists
}

exports.editSupplier = async function editSupplier (root, { id, input }, context) {
  let supplierData = snakeize(input)
  let dbConn = db($.supplier$).where({ id })
  !R.isEmpty(supplierData) && dbConn.update(R.pick(modelColumns($.supplier$), supplierData))
  let [supplier] = await dbConn
    .returning('*')
    .then(camelize)
  return { supplier }
}
