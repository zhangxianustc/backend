const { camelize, snakeize } = require('casing')
const R = require('ramda')
const layerify = require('layerify')
const queryFields = require('../util/query-fields')
const { underscored } = require('underscore.string.fp')
const db = require('../config/db')
const { $ } = require('../db-models')
const { ERROR_CODES: { INVALID_ARGUMENTS }, ERROR_MESSAGES } = require('../config/errors')

exports.addCompanyContact = async function addCompanyContact (root, args, context) {
  const inputData = snakeize(args.input)
  if (context.auth.customer) {
    inputData.customer_id = context.auth.customer.id
  } else if (context.auth.foreman) {
    inputData.foreman_id = context.auth.foreman.id
  } else {
    return {
      error: {
        code: INVALID_ARGUMENTS,
        message: `user ${ERROR_MESSAGES.NOT_EXIST.en}`,
        message_cn: `用户${ERROR_MESSAGES.NOT_EXIST.cn}`
      }
    }
  }
  let [companyContact] = await db($.company_contact$)
    .insert(inputData)
    .returning('*')
    .then(camelize)
  return { companyContact }
}

exports.getCompanyContact = async function getCompanyContact (root, { id }, context) {
  let dbConn = db($.company_contact$)
    .leftOuterJoin($.customer$, $.customer.id, $.company_contact.customer_id)
    .leftOuterJoin($.foreman$, $.foreman.id, $.company_contact.foreman_id)
    .join($.company$, $.company.id, $.company_contact.company_id)

  if (context.auth.customer) {
    dbConn.where($.company_contact.customer_id, context.auth.customer.id)
  }
  if (context.auth.foreman) {
    dbConn.where($.company_contact.foreman_id, context.auth.foreman.id)
  }
  if (context.auth.account) {
    dbConn.where($.company.id, context.auth.account.companyId)
  }

  let [companyContactDetail] = await dbConn
    .select(
      $.company_contact._,
      ...queryFields($.customer$),
      ...queryFields($.foreman$),
      ...queryFields($.company$)
    )
    .where($.company_contact.id, id)
    .then(R.map(layerify))
    .then(camelize)

  return { companyContactDetail }
}

exports.companyContactList = async function companyContactList (root, { offset, limit, filter = {}, sortBy }, context) {
  sortBy = sortBy ? [$.company_contact$ + '.' + underscored(sortBy.key), sortBy.order] : [$.company_contact.create_at, 'DESC']
  let dbConn = db($.company_contact$)
    .leftOuterJoin($.customer$, $.customer.id, $.company_contact.customer_id)
    .leftOuterJoin($.foreman$, $.foreman.id, $.company_contact.foreman_id)
    .join($.company$, $.company.id, $.company_contact.company_id)

  if (context.auth.customer) {
    dbConn.where($.company_contact.customer_id, context.auth.customer.id)
  }
  if (context.auth.foreman) {
    dbConn.where($.company_contact.foreman_id, context.auth.foreman.id)
  }
  if (context.auth.account) {
    dbConn.where($.company.id, context.auth.account.companyId)
  }

  filter.keyword && dbConn.where(function () {
    this.where($.company_contact.name, 'ilike', '%' + filter.keyword + '%')
      .orWhere($.company_contact.phone, 'ilike', '%' + filter.keyword + '%')
      .orWhere($.customer.first_name, 'ilike', '%' + filter.keyword + '%')
      .orWhere($.customer.last_name, 'ilike', '%' + filter.keyword + '%')
      .orWhere($.foreman.first_name, 'ilike', '%' + filter.keyword + '%')
      .orWhere($.foreman.last_name, 'ilike', '%' + filter.keyword + '%')
      .orWhere($.company.name, 'ilike', '%' + filter.keyword + '%')
  })
  let [{ count }] = await dbConn.clone().count()
  let list = await dbConn
    .select([
      $.company_contact._,
      ...queryFields($.customer$),
      ...queryFields($.foreman$),
      ...queryFields($.company$)
    ])
    .limit(limit)
    .offset(offset)
    .orderBy(...sortBy)
    .then(R.map(layerify))
    .then(camelize)

  return { count, list }
}
