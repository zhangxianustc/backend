#!/usr/bin/env node
require('dotenv-flow').config()
require('../util/check-env').checkEnv()
const minimist = require('minimist')
const logger = require('../logger')
const db = require('../config/db')
const { $ } = require('../db-models')
const { camelize } = require('casing')
const C = require('chance').Chance()
const oapply = require('oapply')
const R = require('ramda')

const Usage = `
Usage: ./fake-materials.js <Options>

  fake materials for a company

Options:

  -h, --help            show help
  --company <company_name>
`

let args = minimist(process.argv.slice(2), { alias: { h: 'help' } })

function exit (code) {
  console.log(Usage)
  process.exit(code)
}

args.h && exit(0)

let { company } = args

!company && exit(1)

db.transaction(async function (trx) {
  company = await trx($.company$)
    .where({ name: company })
    .then(it => camelize(it[0]))

  if (!company) {
    throw new Error('no such company')
  }

  let skus = await trx($.sku$)
    .then(camelize)
  if (!skus.length) {
    throw new Error('no skus')
  }

  let suppliers = await trx($.supplier$)
    .then(camelize)

  if (!suppliers.length) {
    throw new Error('no suppliers')
  }
  suppliers = R.groupBy(it => it.name, suppliers)

  let brands = await trx($.brand$)
    .then(camelize)

  if (!brands.length) {
    throw new Error('no brands')
  }
  brands = R.groupBy(it => it.name, brands)

  let units = await trx($.unit$)
    .where({ company_id: company.id })

  if (!units.length) {
    throw new Error('no units')
  }
  units = R.groupBy(it => it.name, units)

  let skuData = R.groupBy(it => it.code, require('../data/skus'))

  let materials = await Promise.all(C.pickset(skus, skus.length).map(sku => oapply(
    {
      sku_id: sku.id,
      name: skuData[sku.code][0].materialName,
      supplier_id: suppliers[skuData[sku.code][0].supplier][0].id,
      brand_id: brands[skuData[sku.code][0].brand][0].id,
      sale_price: skuData[sku.code][0].salePrice,
      purchase_price: skuData[sku.code][0].purchasePrice,
      market_price: skuData[sku.code][0].marketPrice,
      currency: 'CNY',
      unit_id: units[skuData[sku.code][0].unit][0].id,
      supply_cycle_in_days: skuData[sku.code][0].supplierCycleInDays,
      images: sku.images,
      company_id: company.id
    }
  )))
  materials = await trx($.material$).insert(materials)
    .returning('*').then(camelize)
  let roomTypes = await trx($.room_type$).then(camelize)
  await trx($.material_2_room_type$)
    .insert(R.flatten(materials.map(m =>
      C.pickset(roomTypes, C.integer({ min: 1, max: 2 })).map(
        rt => ({
          room_type_id: rt.id,
          material_id: m.id
        })
      ))))
})
  .then(() => {
    db.destroy()
  })
  .catch(err => {
    logger.error(err)
    db.destroy()
    process.exit(1)
  })
