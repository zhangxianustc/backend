#!/usr/bin/env node
require('dotenv-flow').config()
require('../util/check-env').checkEnv()
const minimist = require('minimist')
const db = require('../config/db')
const inquirer = require('inquirer')
const { camelize } = require('casing')
const R = require('ramda')
const logger = require('../logger')

const USAGE = `
  Usage: remove-company.js [company_name] <Options>

  remove a company by name

  Options:
    -h, --help                show this help
`

let exit = function exit (code) {
  console.log(USAGE)
  process.exit(code)
}

let args = minimist(process.argv.slice(2), {
  alias: {
    h: 'help'
  }
})

args.h && exit(0)

let { _: [name] } = args

!name && exit(1)

if (require.main === module) {
  (async function () {
    logger.info('removing company ' + name + ' ...')
    try {
      let [org] = await db('company').where({ name })
        .then(R.map(camelize))
      if (!org) {
        logger.error('No such company')
        db.destroy()
        process.exit(1)
      }
      let { confirmRemove } = await inquirer.prompt({
        type: 'confirm',
        name: 'confirmRemove',
        message: [
          [
            'This is a dangerous operation',
            'normally you don\'t need to remove a company',
            'are you sure to remove this company?'
          ].join(', '),
          JSON.stringify(org, null, 4)
        ].join('\n'),
        default: false
      })
      if (confirmRemove) {
        await db('company')
          .delete()
          .where({ name })
      }
    } catch (e) {
      logger.error(e)
      process.exit(1)
    } finally {
      logger.info('DONE.')
      db.destroy()
    }
  })()
}
