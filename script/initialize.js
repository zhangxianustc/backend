#!/usr/bin/env node
require('dotenv-flow').config()
require('../util/check-env').checkEnv()
const fs = require('fs-extra')
const yaml = require('js-yaml')
const db = require('../config/db')
const logger = require('../logger')
const baseGetter = require('../util/base-getter')
const ora = require('ora')
const { snakeize } = require('casing')

const PRINCIPAL_FILE_PATH = 'policy/principal.yml'

let spinner = ora()
db.transaction(async function (trx) {
  spinner.start('creating needs')
  let { needs } = await fs.readFile(PRINCIPAL_FILE_PATH, 'utf-8')
    .then(yaml.safeLoad)
  await trx.batchInsert('need', needs.map(value => ({ value })))
  spinner.start('creating services')
  await trx.batchInsert('service', await baseGetter.get('service_list')
    .then(snakeize))
})
  .then(() => {
    spinner.succeed()
    db.destroy()
  })
  .catch(err => {
    logger.error(err)
    db.destroy()
    process.exit(1)
  })
