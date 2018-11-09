#! /usr/bin/env node
require('dotenv-flow').config()
require('../util/check-env').checkEnv()
const minimist = require('minimist')
const logger = require('../logger')
const R = require('ramda')
const models = require('../db-models')
const db = require('../config/db')

const USAGE = `
  USAGE: create-schemas.js <options>
  create the schemas(namely tables) should be in schema "public"

  OPTIONS:
    -h, --help    show help
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
const schema = 'public'
db.transaction(function (trx) {
  return (async function () {
    logger.info('creating public schemas...')
    for (let [ tableName, def ] of R.toPairs(models)) {
      if (tableName === '$') {
        continue
      }
      logger.info(`  creating schema "${tableName}" ...`)
      const tableIndex = R.indexOf(tableName, ['appointment', 'order', 'supplier_order'])
      if (tableIndex >= 0) {
        let seqName = tableIndex === 0 ? 'appt_seq'
          : tableIndex === 1 ? 'order_seq'
            : tableIndex === 2 ? 'supplier_order_seq'
              : ''
        let seqs = await trx.raw('select * from information_schema.sequences')
        if (seqName && seqs && seqs.rows) {
          for (let seq of seqs.rows) {
            if (seq.sequence_name && seq.sequence_schema === schema && seq.sequence_name === seqName) {
              // Drop sequence if exists
              await db.raw('drop sequence ' + schema + '.' + seqName)
              break
            }
          }
        }
        // Re-create sequence
        await trx.raw('create sequence ' + schema + '.' + seqName + ' start with 1')
      }
      await trx.schema.createTable(tableName, t => {
        for (let field of R.values(def)) {
          if (typeof field === 'function') {
            field(t, db)
          }
        }
      })
      logger.info('  DONE.')
    }
  })()
})
  .then(function () {
    db.destroy()
    logger.info('DONE.')
  })
  .catch(function (e) {
    logger.error(e)
    db.destroy()
    process.exit(-1)
  })
