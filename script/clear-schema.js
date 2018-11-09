#! /usr/bin/env node
require('dotenv-flow').config()
require('../util/check-env').checkEnv()
const db = require('../config/db')
const logger = require('../logger')
const minimist = require('minimist')

const USAGE = `
  Usage: clear-schema.js <schema> <options>

  Remove all the schemes in a schema, if no schema provided, 
  use schema "public"

  Options:
  
    -h, --help                  show help
`

let args = minimist(process.argv.slice(2), {
  alias: {
    h: 'help'
  }
})

if (args.h) {
  console.log(USAGE)
  process.exit(0)
}

let [schema = 'public'] = args._

;(async function () {
  try {
    logger.info('clearing schemes in schema ' + schema + '...')
    let { rows } = await db.schema.raw(`
      select tablename from pg_tables where schemaname='${schema}'
    `)
    console.log('ok')
    if (!rows.length) {
      logger.info('no schemes in schema "' + schema + '"')
    }
    for (let { tablename } of rows) {
      logger.info(' remove scheme ' + tablename + '...')
      await db.schema.raw(`
        drop table if exists ${schema}.${tablename} cascade
      `)
      logger.info('  DONE.')
    }
    logger.info('DONE.')
  } catch (e) {
    logger.error(e)
    process.exit(-1)
  } finally {
    db.destroy()
  }
})()
