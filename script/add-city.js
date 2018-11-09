#!/usr/bin/env node
require('dotenv-flow').config()
require('../util/check-env').checkEnv()
const minimist = require('minimist')
const R = require('ramda')
const db = require('../config/db')
const logger = require('../logger')

const USAGE = `

  Usage: add-city.js <options>

  add an city

  Options:

    -h, --help                        show help
    -n, --name <name>                     set name
    -c, --citycode <citycode>             set citycode 
`
let args = minimist(process.argv.slice(2), {
  alias: {
    h: 'help',
    n: 'name',
    c: 'citycode'
  }
})

if (args.h) {
  console.log(USAGE)
  process.exit(0)
}

let { name, citycode } = args
!(name && citycode) && process.exit(1)

let code = R.toString(citycode)
if (code.length < 4 && code.charAt(0) !== '0') {
  citycode = R.concat('0', code)
}

db('city')
  .insert({
    name,
    citycode
  })
  .then(() => {
    db.destroy()
  })
  .catch(err => {
    logger.error(err)
    db.destroy()
    process.exit(1)
  })
