#!/usr/bin/env node
require('dotenv-flow').config()
require('../util/check-env').checkEnv()
const minimist = require('minimist')
const db = require('../config/db')
const { $ } = require('../db-models')
const R = require('ramda')
const C = require('chance').Chance()
const addDays = require('date-fns/addDays')
const { STATES } = require('../fsm/appointment-fsm')

const usage = `
  Usage: fake-appointments.js <Options>

    fake some appointments of a company

  Options:
    -h, --help                    show this help
    -c, --company                 company's name
    -n, --number                  number of appointments
`

let args = minimist(process.argv.slice(2), {
  alias: {
    h: 'help',
    c: 'company',
    n: 'number'
  }
})

function exit (code) {
  console.log(usage)
  process.exit(code)
}

args.h && exit(0)

!args.company && exit(1)

;(async function () {
  let [company] = await db($.company$).where({ name: args.company })
  if (!company) {
    throw new Error('no such company: ' + args.company)
  }
  let salespersonList = await db($.account$)
    .join($.account_2_role$, $.account_2_role.account_id, $.account.id)
    .join($.role$, $.role.id, $.account_2_role.role_id)
    .select($.account.id)
    .where($.role.name, 'salesperson')
    .andWhere($.account.company_id, company.id)

  if (!salespersonList.length) {
    throw new Error('no salesperson in company: ' + company.name)
  }

  await db.batchInsert(
    $.appointment$,
    R.range(0, args.number || 48).map(i => {
      let status = C.pickone(Object.values(STATES))
      return {
        company_id: company.id,
        last_name: C.last(),
        title: C.pickone(['Ms', 'Mr']),
        mobile: C.phone(),
        on_site: C.bool(),
        address: C.address(),
        meet_at: addDays(new Date(), C.integer({ min: -7, max: 7 })),
        status,
        salesperson_id: C.pickone(salespersonList).id,
        memo: C.sentence(),
        close_reason: status === STATES.closed ? C.sentence() : '',
        create_at: addDays(new Date(), C.integer({ min: -7, max: 0 }))
      }
    })
  )
})()
  .then(() => {
    db.destroy()
  })
  .catch(err => {
    console.error(err)
    db.destroy()
    process.exit(1)
  })
