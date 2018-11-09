#!/usr/bin/env node
require('dotenv-flow').config()
require('../util/check-env').checkEnv()
const minimist = require('minimist')
const db = require('../config/db')
const logger = require('../logger')

const usage = `
Usage: add-sku-category.js <Options>

  add a brand

Options:

  -h, --help                show help
  --name <name>

`

let args = minimist(process.argv.slice(2), {
  alias: { h: 'help' }
})

function exit (code) {
  console.log(usage)
  process.exit(0)
}

args.h && exit(0)

let { name } = args

!name && exit(1)

db('sku_category')
  .insert({ name })
  .then(() => {
    db.destroy()
  })
  .catch(err => {
    logger.error(err)
    db.destroy()
    process.exit(1)
  })
