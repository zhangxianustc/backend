const { camelize, snakeize } = require('casing')
const R = require('ramda')
const db = require('../config/db')
const { $ } = require('../db-models')
const { queryObject } = require('../util/object-query')
const bcrypt = require('bcryptjs')
const jwtSign = require('../util/jwt-sign')
const { ERROR_CODES: { INVALID_ARGUMENTS }, ERROR_MESSAGES } = require('../config/errors')

exports.registerCustomer = async function registerCustomer (root, args) {
  let customerInput = snakeize(args.input)
  let csQuery = { email: customerInput.email }
  let existCustomer = await queryObject($.customer$, csQuery)
  if (existCustomer) {
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
  if (customerInput.password) {
    customerInput.pwd_hash = await bcrypt.hash(customerInput.password, Number(process.env.SALT_ROUNDS || 10))
  }

  delete customerInput.password
  let [customer] = await db($.customer$)
    .insert(customerInput)
    .returning('*')
    .then(camelize)
  customer.token = jwtSign({ customer })
  return { customer }
}

exports.loginAsCustomer = async function loginAsCustomer (root, { email, password }) {
  let customer = await queryObject($.customer$, { email })
  if (!customer) {
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

  if (!await bcrypt.compare(password, customer.pwdHash)) {
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
  delete customer.pwdHash
  customer.token = jwtSign({ customer })
  return { customer }
}

exports.getCustomer = function getCustomer (root, query) {
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
          },
          {
            field: 'mobile',
            reason: `${ERROR_MESSAGES.NOT_EXIST.en} mobile`,
            reason_cn: `手机号码${ERROR_MESSAGES.NOT_EXIST.cn}`
          }
        ]
      }
    }
  }
  return queryObject($.customer$, query)
}

exports.updateCustomerProfile = async (root, { id, input }, context) => {
  let [customer] = await db($.customer$)
    .where({ id })
    .update(snakeize(input))
    .returning('*')
    .then(camelize)
  return { customer }
}
