#!/usr/bin/env node
require('dotenv-flow').config()
require('../util/check-env').checkEnv()
const minimist = require('minimist')
const logger = require('../logger')
const db = require('../config/db')
const { $ } = require('../db-models')

const Usage = `
Usage: add-sku.js <Options>

  add a sku

Options:

  -h, --help                  show help
  --name <name>
  --code <code>
  --texture <texture>
  --dimension [dimension]
  --image <image>
  --desc [desc]
  --sku_category [sku category name]
`

function exit (code) {
  console.log(Usage)
  process.exit(code)
}

let args = minimist(process.argv.slice(2), {
  alias: { h: 'help' }
})

args.h && exit(0)

let { name, texture, code, dimension, image, desc = '' } = args
let skuCategory = args['sku-category']
!name && exit(1)
!texture && exit(1)
!code && exit(1)
!dimension && exit(1)
!image && exit(1)
!skuCategory && exit(1)

db.transaction(async function (trx) {
  const [skuCate] = await trx($.sku_category$)
    .where($.sku_category.name, skuCategory)

  await trx($.sku$)
    .insert({
      name,
      texture,
      code,
      dimension,
      images: [].concat(image),
      desc,
      sku_category_id: skuCate.id
    })
})
  .then(() => {
    db.destroy()
  })
  .catch(err => {
    logger.error(err)
    db.destroy()
    process.exit(1)
  })
