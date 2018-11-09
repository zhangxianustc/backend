const RandomString = require('randomstring')
const { sendEmail } = require('../util/send-email')
const { redis } = require('../config/redis')
const { ERROR_CODES: { INVALID_ARGUMENTS }, ERROR_MESSAGES } = require('../config/errors')

exports.sendRegistrationEmail = async (root, { email, clientType, lang = 'cn' }) => {
  let redisDb = 0
  switch (clientType) {
    case 'Foreman':
      redisDb = 0
      clientType = lang === 'cn' ? '云工长' : clientType
      break
    case 'Customer':
      redisDb = 1
      clientType = lang === 'cn' ? '业主' : clientType
      break
    case 'Company':
      redisDb = 2
      clientType = 'SaaS'
      break
  }
  const regRedis = redis(redisDb)
  const randomCode = RandomString.generate({ length: 6, charset: 'numeric' })
  await regRedis.set(email, randomCode)
  const expiration = Number(process.env.EMAIL_VERIFICATION_CODE_EXPIRATION || 5)
  await regRedis.expire(email, expiration * 60)
  return sendEmail({
    template: lang + '_registration_code',
    recipient: email,
    locals: {
      service: clientType,
      security_code: randomCode,
      expiration: expiration
    }
  })
    .then(res => { return { recipients: res.accepted, messageId: res.messageId } })
    .catch(err => {
      if (err.message === 'No recipients defined' || err.code === 'EENVELOPE') {
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
}

exports.sendChangeEmailVerificationCode = async (root, { email, clientType, lang = 'cn' }) => {
  let redisDb = 0
  switch (clientType) {
    case 'Foreman':
      redisDb = 0
      break
    case 'Customer':
      redisDb = 1
      break
    case 'Company':
      redisDb = 2
      break
  }
  const randomCode = RandomString.generate({ length: 6, charset: 'numeric' })
  const regRedis = redis(redisDb)
  await regRedis.set(email, randomCode)
  const expiration = Number(process.env.EMAIL_VERIFICATION_CODE_EXPIRATION || 5)
  await regRedis.expire(email, expiration * 60)
  return sendEmail({
    template: lang + '_account_confirmation',
    recipient: email,
    locals: {
      security_code: randomCode,
      target_email: email,
      expiration: expiration
    }
  })
    .then(res => { return { recipients: res.accepted, messageId: res.messageId } })
    .catch(err => {
      if (err.message === 'No recipients defined' || err.code === 'EENVELOPE') {
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
}
