#!/usr/bin/env node
require('dotenv-flow').config()
require('../util/check-env').checkEnv()
const minimist = require('minimist')
const logger = require('../logger')
const db = require('../config/db')

const usage = `
Usage: add-suppliers <Options>

  add supplier

Options:

  -h, --help                  show this help
  --name <name>
  --email <email>
  --mobile <mobile>
  --address <address>
`

let args = minimist(process.argv.slice(2), {
  alias: { h: 'help' }
})

function exit (code) {
  console.log(usage)
  process.exit(code)
}

args.h && exit(0)

let { name, email, mobile, address } = args

!(name && email && mobile && address) && exit(1)

db('supplier')
  .insert({
    name, email, mobile, address
  })
  .then(() => {
    db.destroy()
  })
  .catch(err => {
    logger.error(err)
    db.destroy()
    process.exit(1)
  })
