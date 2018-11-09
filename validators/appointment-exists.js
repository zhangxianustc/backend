const db = require('../config/db')
const { camelize } = require('casing')
const { $ } = require('../db-models')
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

function appointmentExists (idGetter) {
  return async function (root, args, context, info, next) {
    let id = idGetter(args)
    let [appointment] = await db($.appointment$)
      .where({ id })
      .then(camelize)
    if (!appointment) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `${ERROR_MESSAGES.NOT_EXIST.en} appointment`,
          message_cn: `预约单${ERROR_MESSAGES.NOT_EXIST.cn}`
        }
      }
      return
    }
    context[appointmentExists.appointmentSym] = appointment
    await next()
  }
}
appointmentExists.appointmentSym = Symbol('appointmentSym')
appointmentExists.getAppointment = ctx => ctx[appointmentExists.appointmentSym]
module.exports = appointmentExists
