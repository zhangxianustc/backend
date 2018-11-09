#!/usr/bin/env node
require('dotenv-flow').config()
require('../util/check-env').checkEnv()
const R = require('ramda')
const modelColumns = require('../util/model-columns')
const db = require('../config/db')
const bcrypt = require('bcryptjs')
const minimist = require('minimist')
const ora = require('ora')
const inquirer = require('inquirer')
const { snakeize } = require('casing')
const logger = require('../logger')
const emailRegex = require('email-regex')

const Usage = `
  Usage: create-account.js <options>
  create a non-root account
  
  Options:
    -h, --help              show this help
`

let args = minimist(process.argv.slice(2), {
  alias: { h: 'help' }
})

if (args.h) {
  console.log(Usage)
  process.exit(0)
}

async function createAccount (data, roleIdList = [], trx = db) {
  let pwdHash = await bcrypt.hash(data.password, Number(process.env.SALT_ROUNDS || 10))
  data = R.pick(modelColumns('account'), snakeize(data))
  data.pwd_hash = pwdHash

  let [ account ] = await trx('account')
    .insert(data)
    .returning('*')

  await trx('account_2_role')
    .insert(roleIdList.map(roleId => ({
      account_id: account.id,
      role_id: roleId
    })))
}

module.exports = createAccount

if (require.main === module) {
  (async function () {
    let spinner = ora()

    try {
      let { companyId } = await inquirer.prompt({
        type: 'list',
        name: 'companyId',
        message: 'Please select company: ',
        choices: await db('company')
          .then(R.map(it => ({
            name: it.name,
            value: it.id
          })))
      })
      let { roleIdList } = await inquirer.prompt({
        type: 'checkbox',
        name: 'roleIdList',
        message: 'Please select company: ',
        choices: await db('role')
          .where({ company_id: companyId })
          .map(it => ({
            name: it.name,
            value: it.id
          })),
        validate (input) {
          return !!(input && input.length) || 'select at lease one role!'
        }
      })
      let { email, password } = await inquirer.prompt([
        {
          type: 'input',
          name: 'email',
          message: 'please input email:',
          validate (input) {
            return (!!input && emailRegex({ exact: true }).test(input)) || 'do input an email!'
          }
        }, {
          type: 'input',
          name: 'password',
          message: 'please input password:',
          validate (input) {
            return !!input || 'do input a password!'
          }
        }
      ])
      spinner.start('creating account...')
      let [account] = await db('account')
        .where({ email })
      if (account) {
        throw new Error('email ' + email + ' already exists')
      }
      await createAccount({
        email,
        company_id: companyId,
        password
      }, roleIdList)
      spinner.succeed()
    } catch (e) {
      logger.error(e)
      spinner.fail()
    } finally {
      db.destroy()
    }
  })()
}
