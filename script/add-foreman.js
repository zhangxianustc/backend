#!/usr/bin/env node
require('dotenv-flow').config()
require('../util/check-env').checkEnv()
const minimist = require('minimist')
const db = require('../config/db')
const ora = require('ora')
const logger = require('../logger')
const emailRegex = require('email-regex')
const inquirer = require('inquirer')
const bcrypt = require('bcryptjs')

const Usage = `
  Usage: add-foreman.js <Options>

    add a foreman

  Options:

    -h, --help            show help
    -e, --email           foreman's email
    -p, --password        foreman's password
    -m, --mobile          foreman's mobile
`

let args = minimist(process.argv.slice(2), {
  alias: {
    h: 'help',
    e: 'email',
    p: 'password',
    m: 'mobile'
  }
})

if (args.h) {
  console.log(Usage)
  process.exit(0)
}

let { email, password, mobile, status } = args

let spinner = ora()

;(async function () {
  email = email || await inquirer.prompt({
    type: 'input',
    name: 'email',
    message: 'please input email:',
    validate (input) {
      return (!!input && emailRegex({ exact: true }).test(input)) || 'do input an email!'
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

  mobile = mobile || await inquirer.prompt({
    type: 'input',
    name: 'mobile',
    message: 'please input your mobile:',
    validate (input) {
      return !!input || 'do input a mobile!'
    }
  }).then(it => it.mobile)

  spinner.start('creating foreman')
  await db('foreman')
    .insert({
      email,
      pwd_hash: pwdHash,
      mobile,
      first_name: args.first_name || '',
      last_name: args.last_name || '',
      status: status || 'inactive'
    })
  spinner.succeed()
})()
  .then(() => {
    db.destroy()
  })
  .catch(err => {
    spinner.fail()
    db.destroy()
    logger.error(err)
    process.exit(1)
  })
