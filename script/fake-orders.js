#!/usr/bin/env node
require('dotenv-flow').config()
require('../util/check-env').checkEnv()
const minimist = require('minimist')
const logger = require('../logger')
const inquirer = require('inquirer')
const { camelize } = require('casing')
const db = require('../config/db')
const { $ } = require('../db-models')
const C = require('chance').Chance()
const { STATES } = require('../fsm/order-fsm')
const { SERVICE_MODULE_TYPES } = require('../const')
const R = require('ramda')
const layerify = require('layerify')
const qf = require('../util/query-fields')

const Usage = `

Usage: fake-order.js <Options>

  fake orders for a company

Options:

  -h, --help                      show this help
  --company <company_name>
  --number [number of orders]
`

let args = minimist(process.argv.slice(2), {
  alias: { h: 'help' }
})

function exit (code) {
  console.log(Usage)
  process.exit(code)
}

args.h && exit(0)

let { company } = args

!company && exit(1)

db.transaction(async function (trx) {
  company = company || inquirer.prompt({
    type: 'input',
    name: 'company',
    message: 'please input company\'s name:',
    validate (company) {
      return !!company || 'You should input a company!'
    }
  }).then(it => it.company)

  company = await trx($.company$)
    .where({ name: company })
    .then(it => camelize(it[0]))

  if (!company) {
    throw Error('no such company')
  }

  let salespersons = await trx($.account$)
    .join($.account_2_role$, $.account_2_role.account_id, $.account.id)
    .join($.role$, $.role.id, $.account_2_role.role_id)
    .select($.account._)
    .where($.account.company_id, company.id)
    .andWhere($.role.name, 'salesperson')

  if (!salespersons.length) {
    throw Error('no salespersons in company')
  }

  let designers = await trx($.account$)
    .join($.account_2_role$, $.account_2_role.account_id, $.account.id)
    .join($.role$, $.role.id, $.account_2_role.role_id)
    .select($.account._)
    .where($.account.company_id, company.id)
    .andWhere($.role.name, 'designer')

  if (!designers.length) {
    throw Error('no designers in company')
  }

  let units = await trx($.unit$)
    .where($.unit.company_id, company.id)

  let foremen = await trx($.foreman$)

  let customers = await trx($.customer$)

  let roomTypes = await trx($.room_type$)
    .where($.room_type.company_id, company.id)

  if (!roomTypes.length) {
    throw new Error('no room types')
  }

  let materials = await trx($.material$)
    .join($.brand$, $.material.brand_id, $.brand.id)
    .join($.unit$, $.unit.id, $.material.unit_id)
    .select(
      $.material._,
      ...qf($.brand$),
      ...qf($.unit$)
    )
    .where($.material.company_id, company.id)
    .then(R.map(layerify))
    .then(camelize)

  if (!materials.length) {
    throw new Error('no materials')
  }

  for (let i = 0; i < Number(args.number || 10); ++i) {
    let status = C.pickone(Object.values(STATES))
    let salesperson = C.pickone(salespersons)
    let [order] = await trx($.order$)
      .insert({
        company_id: company.id,
        salesperson_id: salesperson.id,
        designer_id: status === STATES.selecting_designer ? null : C.pickone(designers).id,
        deposit: C.integer({ min: 1000, max: 100000 }),
        currency: 'CNY',
        status: status,
        customer_id: C.pickone(customers).id,
        zipcode: C.zip(),
        address: C.address(),
        total_area: C.integer({ min: 30, max: 1000 }),
        total_area_unit_id: C.pickone(units).id,
        creator_id: salesperson.id,
        foreman_id: ~[STATES.constructing, STATES.evaluating, STATES.completed].indexOf(status)
          ? C.pickone(foremen).id
          : null,
        estimated_start_date: C.date({ year: new Date().getYear() + 1900 }),
        down_payment_amount: C.integer({ min: 500000, max: 2000000 }),
        interim_payment_amount: C.integer({ min: 3000000, max: 10000000 }),
        retainage_payment_amount: C.integer({ min: 500000, max: 5000000 })
      })
      .returning('*')
      .then(camelize)
    let _roomTypes = C.pickset(roomTypes, C.integer({ min: 1, max: 3 }))
    await trx($.room_4_order$)
      .insert(_roomTypes.map(roomType => ({
        type_id: roomType.id,
        quantity: C.integer({ min: 1, max: 3 }),
        order_id: order.id
      })))

    let [serviceModule] = await trx($.service_module$)
      .insert({
        name: '物料',
        type: SERVICE_MODULE_TYPES.MATERIAL,
        order_id: order.id
      })
      .returning('*')
      .then(camelize)

    let batchNo = order.id + '' + (new Date()).getTime()
    await trx($.order_material$)
      .insert(
        C.pickset(materials, materials.length)
          .map(material => ({
            batch_no: batchNo,
            module_id: serviceModule.id,
            material_id: material.id,
            name: material.name,
            brand: material.brand.name,
            supplier_id: material.supplierId,
            sku_id: material.skuId,
            quantity: C.integer({ min: 1, max: 10 }),
            unit: material.unit.name,
            sale_price: material.salePrice,
            purchase_price: material.purchasePrice,
            currency: material.currency,
            supply_cycle_in_days: material.supplyCycleInDays
          })))
  }
})
  .then(() => {
    db.destroy()
  })
  .catch(err => {
    db.destroy()
    logger.error(err)
    process.exit(1)
  })
