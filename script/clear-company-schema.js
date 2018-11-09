#!/usr/bin/env node
require('dotenv-flow').config()
require('../util/check-env').checkEnv()
const db = require('../config/db')
const minimist = require('minimist')
const logger = require('../logger')

const USAGE = `
  Usage: clear-company-schema.js [schema] <Options>

  clear/drop a company's schema

  Options:
    -h, -help           show this help
    -d                  drop the schema as well
`

let exit = code => {
  console.log(USAGE)
  process.exit(code)
}

let args = minimist(process.argv.slice(2), {
  alias: {
    h: 'help'
  }
})

args.h && exit(0)

let { _: [schema] } = args

!schema && exit(1)

;(async function () {
  try {
    if (args.d) {
      logger.info('droping schema ' + schema + ' ...')
      await db.schema.raw(`drop schema ${schema} cascade`)
      logger.info('DONE.')
    } else {
      logger.info('drop schemes under schema ' + schema + ' ...')
      let { rows } = await db.schema
        .raw(`select tablename from pg_tables where schemaname = '${schema}'`)
      for (let { tablename } of rows) {
        logger.info('drop scheme ' + tablename)
        await db.schema.raw(`drop table if exists ${schema}.${tablename} cascade`)
      }
      logger.info('DONE.')
    }
  } catch (e) {
    logger.error(e)
    process.exit(1)
  } finally {
    db.destroy()
  }
})()
