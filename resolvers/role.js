const { camelize, snakeize } = require('casing')
const R = require('ramda')
const db = require('../config/db')
const layerify = require('layerify')
const queryFields = require('../util/query-fields')
const { underscored } = require('underscore.string.fp')
const { $ } = require('../db-models')

exports.createRole = async function (root, { name, identity }, context) {
  const companyId = context.auth.account.company.id
  let [role] = await db($.role$)
    .insert({ name, identity, company_id: companyId })
    .returning('*')
    .then(camelize)
  if (role) {
    role.company = await db($.company$).where({ id: companyId })
  }
  return { role }
}

exports.editRole = async function (root, { id, input }, context) {
  const companyId = context.auth.account.company.id
  const roleData = snakeize(input)
  let dbConn = db($.role$)
    .where({ id, company_id: companyId })
  !R.isEmpty(roleData) && dbConn
    .update(roleData)
  let [role] = await dbConn
    .returning('*')
    .then(camelize)
  if (role) {
    role.company = await db($.company$).where({ id: companyId })
  }
  return { role }
}

exports.getRole = async function getRole (root, { id }, context) {
  const companyId = context.auth.account.company.id
  let dbConn = db($.role$)
    .join($.company$, $.company.id, $.role.company_id)
    .where($.role.company_id, companyId)
  let [role] = await dbConn
    .select(
      $.role._,
      ...queryFields($.company$)
    )
    .where($.role.id, id)
    .returning('*')
    .then(R.map(layerify))
    .then(camelize)
  return { role }
}

exports.roleList = async function roleList (root, { offset, limit, filter = {}, sortBy }, context) {
  sortBy = sortBy ? [$.role$ + '.' + underscored(sortBy.key), sortBy.order] : [$.role.name]
  let dbConn = db($.role$)
    .join($.company$, $.company.id, $.role.company_id)

  filter.keyword && dbConn.where(function () {
    this.where($.role.name, 'ilike', '%' + filter.keyword + '%')
      .orWhere($.role.identity, 'ilike', '%' + filter.keyword + '%')
  })
  filter.companyId && dbConn.where($.role.company_id, filter.companyId)

  let [{ count }] = await dbConn.clone().count()
  let list = await dbConn
    .select(
      $.role._,
      ...queryFields($.company$)
    )
    .limit(limit)
    .offset(offset)
    .orderBy(...sortBy)
    .then(R.map(layerify))
    .then(camelize)
  return { count, list }
}
