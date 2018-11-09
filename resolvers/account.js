const { camelize, snakeize } = require('casing')
const R = require('ramda')
const { underscored } = require('underscore.string.fp')
const db = require('../config/db')
const { $ } = require('../db-models')
const queryFields = require('../util/query-fields')
const layerify = require('layerify')
const { ACCOUNT_STATUS } = require('../const')
const bcrypt = require('bcryptjs')
const jwtSign = require('../util/jwt-sign')
const getPrincipal = require('../util/get-principal')
const { ERROR_CODES: { INVALID_ARGUMENTS }, ERROR_MESSAGES } = require('../config/errors')
const roleExists = require('../validators/role-exists')

exports.loginAsCompany = async function loginAsCompany (root, {
  email, password
}) {
  let companyUser = await db($.account$)
    .where({ email })
    .then(it => camelize(it[0]))

  if (!companyUser) {
    return {
      error: {
        code: INVALID_ARGUMENTS,
        message: `${ERROR_MESSAGES.NOT_EXIST.en} email`,
        message_cn: `邮箱${ERROR_MESSAGES.NOT_EXIST.cn}`,
        locations: [{
          field: 'email',
          reason: `${ERROR_MESSAGES.NOT_EXIST.en} email`,
          reason_cn: `邮箱${ERROR_MESSAGES.NOT_EXIST.cn}`
        }]
      }
    }
  }

  if (!await bcrypt.compare(password, companyUser.pwdHash)) {
    return {
      error: {
        code: INVALID_ARGUMENTS,
        message: `${ERROR_MESSAGES.WRONG.en} password`,
        message_cn: `密码${ERROR_MESSAGES.WRONG.cn}`,
        locations: [{
          field: 'password',
          reason: `${ERROR_MESSAGES.WRONG.en} password`,
          reason_cn: `密码${ERROR_MESSAGES.WRONG.cn}`
        }]
      }
    }
  }
  delete companyUser.pwdHash
  companyUser.company = await db('company')
    .where({ id: companyUser.companyId })
    .then(it => camelize(it[0]))
  companyUser.roles = await (
    companyUser.isRoot
      ? db($.role$)
        .where($.role.company_id, companyUser.companyId)
      : db($.role$)
        .join(
          $.account_2_role$,
          $.account_2_role.role_id,
          $.role.id
        )
        .select($.role._)
        .where($.account_2_role.account_id, companyUser.id)
  ).then(camelize)

  companyUser.currentRole = companyUser.isRoot
    ? companyUser.roles.filter(it => it.name === 'admin')[0]
    : companyUser.roles[0]

  require('../logger').debug(companyUser.currentRole)

  companyUser.token = jwtSign({ account: companyUser })
  companyUser.principal = (await getPrincipal('account', companyUser)).toJson()
  return { account: companyUser }
}

exports.doesEmailExist = (root, { email }) =>
  db($.account$).where({ email })
    .count().then(([{ count }]) => Number(count) > 0)

exports.companyAccounts = async function companyAccounts (root, { offset, limit, filter = {}, sortBy }, context) {
  sortBy = sortBy ? [$.account$ + '.' + underscored(sortBy.key), sortBy.order] : [$.account.create_at, 'DESC']

  let dbConn = db($.account$)
    .join($.account_2_role$, $.account_2_role.account_id, $.account.id)
    .join($.role$, $.role.id, $.account_2_role.role_id)
    .where($.account.company_id, context.auth.account.company.id)

  filter.createAtAfter && dbConn.where($.account.create_at, '>=', filter.createAtAfter)
  filter.createAtBefore && dbConn.where($.account.create_at, '<=', filter.createAtBefore + ' 23:59:59.999')
  filter.keyword && dbConn.where(function () {
    this.where($.account.email, 'ilike', '%' + filter.keyword + '%')
  })

  filter.roleName && dbConn.where($.role.name, filter.roleName)

  let [{ count }] = await dbConn.clone().count()

  limit && dbConn.limit(limit)
  offset && dbConn.offset(offset)
  let list = await dbConn.orderBy(...sortBy)
    .select(
      [
        $.account._,
        ...queryFields($.role$)
      ]
    )
    .then(R.map(layerify))
    .then(camelize)
  return { count, list }
}

exports.editCompanyAccount = async function (root, { id, input }, context) {
  let accountData = snakeize(input)
  let dbConn = db($.account$)
    .where({ id: id })

  !R.isEmpty(accountData) && dbConn.update(accountData)
  let [account] = await dbConn
    .returning('*')
    .then(camelize)
  if (account) {
    account.company = await db('company')
      .where({ id: account.companyId })
      .then(it => camelize(it[0]))
    account.roles = await db('role')
      .join(
        $.account_2_role$,
        $.account_2_role.role_id,
        $.role.id
      )
      .where($.account_2_role.account_id, account.id)
    account.currentRole = account.roles[0]
    account.principal = (await getPrincipal('account', account)).toJson()
  }
  return { account }
}

exports.switchCompanyAccountStatus = async function (root, { id, action = 'disable' }) {
  let status = action === 'disable' ? ACCOUNT_STATUS.Disabled : ACCOUNT_STATUS.Active
  let [account] = await db($.account$)
    .where({ id: id })
    .update({ status })
    .returning('*')
    .then(camelize)
  if (account) {
    account.company = await db('company')
      .where({ id: account.companyId })
      .then(it => camelize(it[0]))
    account.roles = await db('role')
      .join(
        $.account_2_role$,
        $.account_2_role.role_id,
        $.role.id
      )
      .where($.account_2_role.account_id, account.id)
    account.currentRole = account.roles[0]
    account.principal = (await getPrincipal('account', account)).toJson()
  }
  return { account }
}

exports.principal = function (root, args, context, info) {
  return getPrincipal('account', Object.assign({}, context.auth.account, {
    currentRole: roleExists.getRole(context)
  }))
    .then(principal => ({ principal: principal.toJson() }))
}
