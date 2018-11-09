const { underscored } = require('underscore.string.fp')
const { camelize, snakeize } = require('casing')
const R = require('ramda')
const db = require('../config/db')
const { $ } = require('../db-models')
const { redis } = require('../config/redis')
const {
  FOREMAN_STATUS
} = require('../const')
const { queryObject } = require('../util/object-query')
const bcrypt = require('bcryptjs')
const jwtSign = require('../util/jwt-sign')
const { ERROR_CODES: { INVALID_ARGUMENTS }, ERROR_MESSAGES } = require('../config/errors')

exports.registerForeman = async function registerForeman (root, args) {
  let foremanData = snakeize(args.input)
  let existForeman = await queryObject($.foreman$, { email: foremanData.email })
  if (existForeman) {
    return {
      error: {
        code: INVALID_ARGUMENTS,
        message: `email ${ERROR_MESSAGES.HAS_BEEN_REGISTERED.en}`,
        message_cn: `邮箱${ERROR_MESSAGES.HAS_BEEN_REGISTERED.cn}`,
        locations: [{
          field: 'email',
          reason: `email ${ERROR_MESSAGES.HAS_BEEN_REGISTERED.en}`,
          reason_cn: `邮箱${ERROR_MESSAGES.HAS_BEEN_REGISTERED.cn}`
        }]
      }
    }
  }
  let pwdHash = await bcrypt.hash(foremanData.password, Number(process.env.SALT_ROUNDS || 10))
  delete foremanData.password
  foremanData.pwd_hash = pwdHash
  let [foreman] = await db($.foreman$)
    .insert(foremanData)
    .returning('*')
    .then(camelize)
  foreman.token = jwtSign({ foreman })
  return { foreman }
}

exports.verifyForemanEmail = async function verifyForemanEmail (root, { email, securityCode }) {
  const existingCode = await redis(0).get(email)
  if (!existingCode) {
    return {
      error: {
        code: INVALID_ARGUMENTS,
        message: `securityCode ${ERROR_MESSAGES.IS_EXPIRED.en}`,
        message_cn: `验证码${ERROR_MESSAGES.IS_EXPIRED.cn}`,
        locations: [{
          field: 'securityCode',
          reason: `securityCode ${ERROR_MESSAGES.IS_EXPIRED.en}`,
          reason_cn: `验证码${ERROR_MESSAGES.IS_EXPIRED.cn}`
        }]
      }
    }
  }
  if (securityCode === existingCode) {
    let [foreman] = await db($.foreman$).where({ email })
      .update({ status: FOREMAN_STATUS.ACTIVE })
      .returning('*')
      .then(camelize)
    delete foreman.pwdHash
    foreman.token = jwtSign({ foreman })
    return { foreman }
  }
  return {
    error: {
      code: INVALID_ARGUMENTS,
      message: `securityCode ${ERROR_MESSAGES.WRONG.en}`,
      message_cn: `验证码${ERROR_MESSAGES.WRONG.cn}`,
      locations: [{
        field: 'securityCode',
        reason: `securityCode ${ERROR_MESSAGES.WRONG.en}`,
        reason_cn: `验证码${ERROR_MESSAGES.WRONG.cn}`
      }]
    }
  }
}
exports.loginAsForeman = async function loginAsForeman (root, { email, password }) {
  let foreman = await queryObject($.foreman$, { email })
  if (!foreman) {
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

  if (!await bcrypt.compare(password, foreman.pwdHash)) {
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
  delete foreman.pwdHash
  foreman.token = jwtSign({ foreman })
  return { foreman }
}

exports.getForeman = function getForeman (root, query) {
  if (R.isEmpty(query)) {
    return {
      error: {
        code: INVALID_ARGUMENTS,
        message: `id or email ${ERROR_MESSAGES.MUST_BE_PROVIDED_ONE.en}`,
        message_cn: `ID或邮箱${ERROR_MESSAGES.MUST_BE_PROVIDED_ONE.cn}`,
        locations: [
          {
            field: 'id',
            reason: `${ERROR_MESSAGES.NOT_EXIST.en} id`,
            reason_cn: `id${ERROR_MESSAGES.NOT_EXIST.cn}`
          },
          {
            field: 'email',
            reason: `${ERROR_MESSAGES.NOT_EXIST.en} email`,
            reason_cn: `邮箱${ERROR_MESSAGES.NOT_EXIST.cn}`
          }
        ]
      }
    }
  }
  return queryObject($.foreman$, query)
}

exports.foremen = async function foremen (root, { offset, limit, filter = {}, sortBy }, context) {
  sortBy = sortBy ? [underscored(sortBy.key), sortBy.order] : [$.foreman.create_at, 'ASC']
  let dbConn = db($.foreman_2_company$)
    .join($.foreman$, $.foreman.id, $.foreman_2_company.foreman_id)

  dbConn.where({ company_id: context.auth.account.company.id })

  filter.createAtAfter && dbConn.where($.foreman.create_at, '>=', filter.createAtAfter)
  filter.createAtBefore && dbConn.where($.foreman.create_at, '<=', filter.createAtBefore + ' 23:59:59.999')
  filter.keyword && dbConn.where(function () {
    this.where($.foreman.email, 'ilike', '%' + filter.keyword + '%')
      .orWhere($.foreman.last_name, 'ilike', '%' + filter.keyword + '%')
      .orWhere($.foreman.mobile, 'ilike', '%' + filter.keyword + '%')
  })
  filter.status && dbConn.where($.foreman.status, filter.status)
  let [{ count }] = await dbConn.clone().count()
  let list = await dbConn
    .limit(limit)
    .offset(offset)
    .orderBy(...sortBy)
    .then(camelize)
  return { count, list }
}

exports.bindForeman = async function bindForeman (root, { email, action = 'Bind' }, context) {
  let companyId = context.auth.account.company.id
  let [forman] = await db($.foreman$).where({ email })
    .then(camelize)
  if (!forman) {
    return {
      error: {
        code: INVALID_ARGUMENTS,
        message: `${ERROR_MESSAGES.NOT_EXIST.en} email`,
        message_cn: `邮箱${ERROR_MESSAGES.NOT_EXIST.cn}`,
        locations: [
          {
            field: 'email',
            reason: `${ERROR_MESSAGES.NOT_EXIST.en} email`,
            reason_cn: `邮箱${ERROR_MESSAGES.NOT_EXIST.cn}`
          }
        ]
      }
    }
  }
  let bindData = { foreman_id: forman.id, company_id: companyId }
  let dbConn = db($.foreman_2_company$)
  let [binding] = await dbConn.where(bindData)
  if (action === 'Bind') {
    if (binding) {
      return {
        error: {
          code: INVALID_ARGUMENTS,
          message: `${ERROR_MESSAGES.FAILED_TO_BIND.en} foreman`,
          message_cn: `云工长${ERROR_MESSAGES.FAILED_TO_BIND.cn}`,
          locations: [
            {
              field: 'email',
              reason: `email ${ERROR_MESSAGES.ALREADY_BOUND.en}`,
              reason_cn: `邮箱${ERROR_MESSAGES.ALREADY_BOUND.cn}`
            }
          ]
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
          message: `${ERROR_MESSAGES.FAILED_TO_UNBIND.en} foreman`,
          message_cn: `云工长${ERROR_MESSAGES.FAILED_TO_UNBIND.cn}`,
          locations: [
            {
              field: 'email',
              reason: `email ${ERROR_MESSAGES.NOT_BOUND.en}`,
              reason_cn: `邮箱${ERROR_MESSAGES.NOT_BOUND.cn}`
            }
          ]
        }
      }
    }
    await dbConn.where(bindData).del()
    return { status: 'unbound' }
  }
}

exports.updateForemanProfile = async (root, { id, input }, context) => {
  let [foreman] = await db($.foreman$)
    .where({ id })
    .update(snakeize(input))
    .returning('*')
    .then(camelize)

  return { foreman }
}
