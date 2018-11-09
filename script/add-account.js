#!/usr/bin/env node
require('dotenv-flow').config()
require('../util/check-env').checkEnv()
const minimist = require('minimist')
const db = require('../config/db')
const ora = require('ora')
const bcrypt = require('bcryptjs')
const inquirer = require('inquirer')
const emailRegex = require('email-regex')
const logger = require('../logger')
const R = require('ramda')

const Usage = `
  Usage: add-account.js <Options>

    add account

  Options:

    -h, --help                    show help
    -e, --email                   set account's email
    -r, --role                    set account's role
    -p, --password                set account's password
    -c, --company                 set account's company
    -n, --nickname                set account's nickname

`

let args = minimist(process.argv.slice(2), {
  alias: {
    h: 'help',
    e: 'email',
    r: 'role',
    p: 'password',
    c: 'company',
    n: 'nickname'
  }
})

if (args.h) {
  console.log(Usage)
  process.exit(0)
}

let { email, role, password, company, nickname } = args

let spinner = ora()
db.transaction(function (trx) {
  return (async function () {
    email = email || await inquirer.prompt({
      type: 'input',
      name: 'email',
      message: 'please input email:',
      validate (input) {
        return (!!input && emailRegex({ exact: true }).test(input)) || 'do input an email!'
      }
    }).then(it => it.email)

    nickname = nickname || await inquirer.prompt({
      type: 'input',
      name: 'nickname',
      message: 'please input nickname:',
      validate (input) {
        return !!input || 'do input nickname!'
      }
    }).then(it => it.email)

    password = password || await inquirer.prompt({
      type: 'input',
      name: 'password',
      message: 'please input password:',
      validate (input) {
        return !!input || 'do input a password!'
      }
    }).then(it => it.password)

    let pwdHash = await bcrypt.hash(password, Number(process.env.SALT_ROUNDS || 10))

    company = company || await inquirer.prompt({
      type: 'list',
      name: 'company',
      message: 'please input company\'s name',
      choices: await trx('company').then(R.map(it => it.name))
    }).then(it => it.company)

    company = await trx('company').where({ name: company }).then(it => it[0])

    role = (role && role.split(',')) || await inquirer.prompt({
      type: 'checkbox',
      name: 'role',
      message: 'please select roles:',
      choices: await trx('role')
        .where('company_id', company.id)
        .then(R.map(it => it.name))
    })

    let roles = await trx('role').whereIn('name', [].concat(role))
      .andWhere('company_id', company.id)

    spinner.start('creating account')

    let [account] = await trx('account').insert({
      email,
      company_id: company.id,
      pwd_hash: pwdHash,
      first_name: args.first_name || null,
      last_name: args.last_name || null,
      nickname
    })
      .returning('*')

    await trx('account_2_role').insert(roles.map(role => ({
      account_id: account.id,
      role_id: role.id
    })))
    spinner.succeed()
  })()
})
  .then(() => {
    db.destroy()
  })
  .catch(err => {
    logger.error(err)
    db.destroy()
    spinner.fail()
    process.exit(1)
  })
