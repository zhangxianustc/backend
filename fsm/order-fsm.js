const { Fsm } = require('async-fsm.js')
const assureOwnProperty = require('../util/assure-own-property')
const db = require('../config/db')
const { $ } = require('../db-models')
const orderExists = require('../validators/order-exists')
const { ORDER_STATUS, ORDER_OPS } = require('../const')

let orderStatusMap = {}
Object.keys(ORDER_STATUS).map(key => {
  orderStatusMap[key] = ORDER_STATUS[key].en
})
const STATES = assureOwnProperty(orderStatusMap)

let orderOpsMap = {}
Object.keys(ORDER_OPS).map(key => {
  orderOpsMap[key] = ORDER_OPS[key].en
})
const OPS = assureOwnProperty(orderOpsMap)

/**
 * This route might be used in many stages
 */
const selectServiceItemsRoute = function (toState = 'signing') {
  return {
    [OPS.select_service_items]: {
      to: toState,
      test (instance) {
        let { auth: { principal } } = instance.bundle()
        return principal.can('select_service_items.order.assignedToMe')
      }
    }
  }
}

const abortRoute = {
  [OPS.abort]: {
    to: STATES.aborted,
    test (instance) {
      let { auth: { principal } } = instance.bundle()
      return principal.can('abort.order')
    }
  }
}

const selectingDesignerState = state => state
  .name(STATES.selecting_designer)
  .label(ORDER_STATUS.selecting_designer.cn)
  .routes(Object.assign(
    {
      [OPS.select_designer]: {
        to: STATES.selecting_service_items,
        test (instance) {
          let { auth: { principal } } = instance.bundle()
          return principal.can('select_designer.order')
        }
      }
    }, abortRoute))

const selectingServiceItemsState = state => state
  .name(STATES.selecting_service_items)
  .label(ORDER_STATUS.selecting_service_items.cn)
  .routes(Object.assign({}, selectServiceItemsRoute(STATES.signing), abortRoute))
  .onEnter(function ({ args: { id, designerId, trx = db } }) {
    return trx($.order$).where({ id })
      .update({
        status: this.state.name(),
        designer_id: designerId,
        update_at: trx.fn.now(6)
      })
  })

const signingState = state => state
  .name(STATES.signing)
  .label(ORDER_STATUS.signing.cn)
  .routes(Object.assign(
    {
      [OPS.sign]: {
        to: STATES.paying_down_payment,
        test (instance) {
          let { auth: { principal } } = instance.bundle()
          return principal.can('sign.order.assignedToMe')
        }
      }

    },
    selectServiceItemsRoute(STATES.signing),
    abortRoute))
  .onEnter(function ({ args: { id, trx = db } }) {
    return trx($.order$).where({ id })
      .update({
        status: this.state.name(),
        update_at: trx.fn.now(6)
      })
  })

const payingDownPaymentState = state => state
  .name(STATES.paying_down_payment)
  .label(ORDER_STATUS.paying_down_payment.cn)
  .routes(Object.assign(
    {
      [OPS.pay_down_payment]: {
        to: STATES.selecting_foreman,
        test (instance) {
          let { auth: { principal } } = instance.bundle()
          return principal.can('pay_down_payment.order')
        }
      }
    },
    selectServiceItemsRoute(STATES.paying_down_payment),
    abortRoute))
  .onEnter(function ({ args: { id, paymentScheme, trx = db } }) {
    return trx($.order$).where({ id }).update({
      status: this.state.name(),
      ...paymentScheme,
      update_at: trx.fn.now(6)
    })
  })

const selectingForemanState = state => state
  .name(STATES.selecting_foreman)
  .label(ORDER_STATUS.selecting_foreman.cn)
  .routes(Object.assign(
    {
      [OPS.select_foreman]: {
        to: STATES.waiting_for_foreman,
        test (instance) {
          let { auth: { principal } } = instance.bundle()
          return principal.can('select_foreman.order.assignedToMe')
        }
      }
    },
    selectServiceItemsRoute(STATES.selecting_foreman)
  ))
  .onEnter(function ({ args: { id, downPaymentReceiptUrls, trx = db } }) {
    return trx($.order$).where({ id }).update({
      status: this.state.name(),
      down_payment_receipt_urls: downPaymentReceiptUrls,
      update_at: trx.fn.now(6)
    })
  })

const waitingForForemanState = state => state
  .name(STATES.waiting_for_foreman)
  .label(ORDER_STATUS.waiting_for_foreman.cn)
  .routes(Object.assign(
    {
      [OPS.accept]: {
        to: STATES.constructing,
        test (instance) {
          let { auth: { principal } } = instance.bundle()
          return principal.can('accept.order.assignedToMe')
        }
      },
      [OPS.refuse]: {
        to: STATES.waiting_for_foreman,
        test (instance) {
          let { auth: { principal } } = instance.bundle()
          return principal.can('refuse.order.assignedToMe')
        }
      },
      [OPS.select_foreman]: {
        to: STATES.waiting_for_foreman,
        test (instance) {
          let { auth: { principal } } = instance.bundle()
          return principal.can('select_foreman.order.assignedToMe')
        }
      }
    },
    selectServiceItemsRoute(STATES.waiting_for_foreman)
  ))
  .onEnter(function ({ args: { id, foremanId, estimatedStartDate, trx = db } }) {
    return trx($.order$).where({ id }).update({
      status: this.state.name(),
      foreman_id: foremanId,
      estimated_start_date: estimatedStartDate,
      update_at: trx.fn.now(6)
    })
  })

const constructingState = state => state
  .name(STATES.constructing)
  .label(ORDER_STATUS.constructing.cn)
  .routes(Object.assign(
    {
      [OPS.accomplish]: {
        to: STATES.evaluating,
        test (instance) {
          let { auth: { principal } } = instance.bundle()
          return principal.can('accomplish.order.assignedToMe')
        }
      }
    },
    selectServiceItemsRoute(STATES.constructing)
  ))
  .onEnter(function ({ args: { id, trx = db } }) {
    return trx($.order$).where({ id })
      .update({
        status: this.state.name(),
        update_at: trx.fn.now(6)
      })
  })

const evaluatingState = state => state
  .name(STATES.evaluating)
  .label(ORDER_STATUS.evaluating.cn)
  .routes({
    [OPS.evaluate]: {
      to: STATES.completed,
      test (instance) {
        let { auth: { principal } } = instance.bundle()
        return principal.can('evaluate.order.assignedToMe')
      }
    }
  })
  .onEnter(function ({ args: { id, trx = db } }) {
    return trx($.order$).where({ id })
      .update({
        status: this.state.name(),
        update_at: trx.fn.now(6)
      })
  })

const completedState = state => state
  .name(STATES.completed)
  .label(ORDER_STATUS.completed.cn)
  .onEnter(function ({ args: { id, evaluations, trx = db, context } }) {
    let order = orderExists.getOrder(context)
    // 计算装企得分
    let companyScore = Math.ceil(((evaluations.salesperson_attitude_score + evaluations.design_style_score) / 2 +
    order.company.rating) / 2)
    // 计算工长得分
    let foremanScore = Math.ceil((evaluations.construction_quality_score / 2 +
      order.foreman.rating) / 2)

    return trx.transaction(async (tranx) => {
      await tranx($.order$)
        .where({ id })
        .update({
          status: this.state.name(),
          finish_at: trx.fn.now(6)
        })
      evaluations.order_id = id
      await tranx($.order_evaluation$).insert(evaluations)
      // 更新装企Rating
      await tranx($.company$)
        .where($.company.id, order.companyId)
        .update('rating', companyScore)
      // 更新工长Rating
      await tranx($.foreman$)
        .where($.foreman.id, order.foremanId)
        .update('rating', foremanScore)
    })
  })

const abortedState = state => state
  .name(STATES.aborted)
  .label(ORDER_STATUS.aborted.cn)
  .onEnter(function ({ args: { id, trx = db } }) {
    return trx($.order$)
      .where({ id })
      .update({
        status: this.state.name()
      })
  })
const orderFsm = new Fsm()
  .addState(selectingDesignerState, true)
  .addState(selectingServiceItemsState)
  .addState(signingState)
  .addState(payingDownPaymentState)
  .addState(selectingForemanState)
  .addState(waitingForForemanState)
  .addState(constructingState)
  .addState(evaluatingState)
  .addState(completedState)
  .addState(abortedState)

module.exports = {
  STATES, OPS, orderFsm
}
