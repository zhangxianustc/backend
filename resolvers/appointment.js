const { camelize, snakeize } = require('casing')
const db = require('../config/db')
const { ERROR_CODES: { INVALID_OP } } = require('../config/errors')
const { underscored } = require('underscore.string.fp')
const { appointmentFsm, OPS } = require('../fsm/appointment-fsm')
const { $ } = require('../db-models')
const { FSMInvalidOp } = require('async-fsm.js')
const qf = require('../util/query-fields')
const R = require('ramda')
const layerify = require('layerify')
const oapply = require('oapply')
const debug = require('debug')('wellliving:appointment')
const appointmentExists = require('../validators/appointment-exists')
const { APPOINTMENT_STATUS, APPOINTMENT_OPS } = require('../const')

function getAppointmentOps ({ status }, context) {
  return appointmentFsm.createInstance(status.name)
    .bundle(context)
    .ops
    .then(ops => (ops || []).map(op => ({
      name: op,
      label: APPOINTMENT_OPS[op].cn
    })))
}

const getAppointment = async function getAppointment (query, trx = db) {
  let appointment = await trx($.appointment$)
    .join($.company$, $.company.id, $.appointment.company_id)
    .leftOuterJoin($.account$ + ' as salesperson', 'salesperson.id', $.appointment.salesperson_id)
    .select(
      $.appointment._,
      ...qf($.account$, [], 'salesperson'),
      ...qf($.company$)
    )
    .where(query)
    .then(R.map(layerify))
    .then(camelize)
    .then(it => it[0])
  if (appointment) {
    appointment.status = {
      name: appointment.status,
      label: APPOINTMENT_STATUS[appointment.status].cn
    }
  }
  return appointment
}

exports.getAppointment = getAppointment

exports.appointment = (root, { id }, context) => {
  return oapply(
    getAppointment({ 'appointment.id': id }),
    async it => { debug(it); it.ops = await getAppointmentOps(it, context) }
  )
}

exports.appointmentStatusList = async (root, arg, context) => {
  let { operable, reachable } = await appointmentFsm
    .createInstance()
    .bundle(context)
    .relevantStates
  let set = new Set()
  for (let state of operable.concat(reachable)) {
    set.add(state)
  }
  return Array.from(set).map(it => ({
    name: it,
    label: appointmentFsm.getState(it).label()
  }))
}

exports.appointments = async function appointments (root, { offset, limit, filter = {}, sortBy }, context) {
  sortBy = sortBy ? [underscored(sortBy.key), sortBy.order] : ['meet_at', 'ASC']
  let dbQuery = db($.appointment$)
    .leftOuterJoin($.account$ + ' as salesperson', 'salesperson.id', $.appointment.salesperson_id)

  filter.companyId && dbQuery.where($.appointment.company_id, filter.companyId)
  filter.meetAtAfter && dbQuery.where($.appointment.meet_at, '>=', filter.meetAtAfter)
  filter.meetAtBefore && dbQuery.where($.appointment.meet_at, '<=', filter.meetAtBefore + ' 23:59:59.999')
  filter.keyword && dbQuery.where(function () {
    this.where($.appointment.last_name, 'ilike', '%' + filter.keyword + '%')
      .orWhere($.appointment.mobile, 'ilike', '%' + filter.keyword + '%')
  })
  filter.status && dbQuery.where($.appointment.status, filter.status)
  filter.salespersonId && dbQuery.where($.appointment.salesperson_id, filter.salespersonId)

  let [{ count }] = await dbQuery.clone().count()

  let list = await dbQuery
    .select(
      $.appointment._,
      ...qf($.account$, [], 'salesperson')
    )
    .limit(limit)
    .offset(offset)
    .orderBy(...sortBy)
    .then(R.map(layerify))
    .then(camelize)
  for (let appointment of list) {
    appointment.status = {
      name: appointment.status,
      label: APPOINTMENT_STATUS[appointment.status].cn
    }
    appointment.ops = await getAppointmentOps(appointment, context)
  }
  return { count, list }
}

exports.addAppointment = async function addAppointment (root, args, context) {
  let apptData = snakeize(args.input)
  apptData.company_id = context.auth.account.company.id
  apptData.status = appointmentFsm.startState.name()
  return db($.appointment$)
    .insert(apptData)
    .returning('*')
    .then(rs => {
      return camelize(rs[0])
    })
}

exports.editAppointment = async function editAppointment (root, { id, input = {} }, context) {
  await db($.appointment$)
    .where({ id })
    .update(snakeize(input))
  return {
    appointment: await oapply(
      getAppointment({ 'appointment.id': id }),
      async it => { it.ops = await getAppointmentOps(it, context) }
    )
  }
}

exports.assignAppointment = async function assignAppointment (root, {
  id, salespersonId
}, context) {
  let appointment = appointmentExists.getAppointment(context)

  try {
    await appointmentFsm.createInstance(appointment.status)
      .bundle(context)
      .perform(OPS.assign, { id, salespersonId })
  } catch (e) {
    if (e instanceof FSMInvalidOp) {
      return {
        error: {
          code: INVALID_OP,
          message: e.message
        }
      }
    }
    // must throw to expose error
    throw e
  }
  return {
    appointment: await oapply(
      getAppointment({ 'appointment.id': id }),
      async it => { it.ops = await getAppointmentOps(it, context) }
    )
  }
}

async function closeAppointment (root, { id, closeReason }, context) {
  let appointment = appointmentExists.getAppointment(context)
  try {
    await appointmentFsm.createInstance(appointment.status)
      .bundle(context)
      .perform(OPS.close, { id, closeReason })
  } catch (e) {
    if (e instanceof FSMInvalidOp) {
      return {
        error: {
          code: INVALID_OP,
          message: e.message
        }
      }
    }
    // must throw to expose error
    throw e
  }
  return {
    appointment: await oapply(
      getAppointment({ 'appointment.id': id }),
      async it => { it.ops = await getAppointmentOps(it, context) }
    )
  }
}

exports.closeAppointment = closeAppointment
