const { Fsm } = require('async-fsm.js')
const assureOwnProperty = require('../util/assure-own-property')
const db = require('../config/db')
const { $ } = require('../db-models')
const { APPOINTMENT_STATUS, APPOINTMENT_OPS } = require('../const')

let appointmentStatusMap = {}
Object.keys(APPOINTMENT_STATUS).map(key => {
  appointmentStatusMap[key] = APPOINTMENT_STATUS[key].en
})

const STATES = assureOwnProperty(appointmentStatusMap)

let appointmentOpsMap = {}
Object.keys(APPOINTMENT_OPS).map(key => {
  appointmentOpsMap[key] = APPOINTMENT_OPS[key].en
})

const OPS = assureOwnProperty(appointmentOpsMap)

const appointmentFsm = new Fsm()
  .addState(state => state
    .name(STATES.unassigned)
    .label(APPOINTMENT_STATUS.unassigned.cn)
    .routes({
      [OPS.assign]: {
        to: STATES.following,
        test (instance) {
          let { auth: { principal } } = instance.bundle()
          return principal.can('assign.appointment')
        }
      },
      [OPS.edit]: {
        to: STATES.unassigned,
        test (instance) {
          let { auth: { principal } } = instance.bundle()
          return principal.can('edit.appointment')
        }
      },
      [OPS.close]: {
        to: STATES.closed,
        test (instance) {
          let { auth: { principal } } = instance.bundle()
          return principal.can('close.appointment')
        }
      }
    }), true)
  .addState(state => state
    .name(STATES.following)
    .label(APPOINTMENT_STATUS.following.cn)
    .routes({
      [OPS.assign]: {
        to: STATES.following,
        test (instance) {
          let { auth: { principal } } = instance.bundle()
          return principal.can('assign.appointment')
        }
      },
      [OPS.edit]: {
        to: STATES.following,
        test (instance) {
          let { auth: { principal } } = instance.bundle()
          return principal.can('edit.appointment.assignedToMe')
        }
      },
      [OPS.convert]: {
        to: STATES.converted,
        test (instance) {
          let { auth: { principal } } = instance.bundle()
          return principal.can('convert.appointment.assignedToMe')
        }
      },
      [OPS.close]: {
        to: STATES.closed,
        test (instance) {
          let { auth: { principal } } = instance.bundle()
          return principal.can('close.appointment.assignedToMe')
        }
      }
    })
    .onEnter(function ({ args: { id, salespersonId, trx = db } }) {
      return trx($.appointment$)
        .where({ id })
        .update({
          status: this.state.name(),
          salesperson_id: salespersonId
        })
    })
  )
  .addState(state => state
    .name(STATES.converted)
    .label(APPOINTMENT_STATUS.converted.cn)
    .onEnter(function ({ args: { id, trx = db } }) {
      return trx($.appointment$)
        .where({ id })
        .update({
          status: this.state.name()
        })
    })
  )
  .addState(state => state
    .name(STATES.closed)
    .label(APPOINTMENT_STATUS.closed.cn)
    .onEnter(function ({ args: { id, closeReason, trx = db } }) {
      return trx($.appointment$)
        .where({ id })
        .update({
          status: this.state.name(),
          close_reason: closeReason
        })
    })
  )

module.exports = {
  appointmentFsm, STATES, OPS
}
