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
const { camelize } = require('casing')

const Usage = `
  Usage: add-customer.js <Options>

    add a customer

  Options:

    -h, --help                        show help
    --email <email>
    --password <password>
    --mobile <mobile>
    --first-name <first_name>
    --last-name <last_name>
    --title <title>
    --avatar <avatar>
    --nickname <nickname>
`

let args = minimist(process.argv.slice(2), {
  alias: {
    h: 'help'
  }
})

if (args.h) {
  console.log(Usage)
  process.exit(0)
}

let {
  email,
  password,
  mobile,
  firstName,
  lastName,
  title,
  avatar,
  nickname
} = camelize(args)

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

  firstName = firstName || await inquirer.prompt({
    type: 'input',
    name: 'firstName',
    message: 'please input your firstName:',
    validate (input) {
      return !!input || 'do input a firstName!'
    }
  }).then(it => it.firstName)

  lastName = lastName || await inquirer.prompt({
    type: 'input',
    name: 'lastName',
    message: 'please input your lastName:',
    validate (input) {
      return !!input || 'do input a lastName!'
    }
  }).then(it => it.lastName)

  title = title || await inquirer.prompt({
    type: 'list',
    name: 'title',
    message: 'please select your title:',
    choices: ['Mr', 'Ms'],
    validate (input) {
      return !!input || 'do input a title!'
    }
  }).then(it => it.title)

  avatar = avatar || await inquirer.prompt({
    type: 'input',
    name: 'avatar',
    message: 'please input your avatar:',
    validate (input) {
      return !!input || 'do input a avatar!'
    }
  }).then(it => it.avatar)

  nickname = nickname || await inquirer.prompt({
    type: 'input',
    name: 'nickname',
    message: 'please input your nickname:',
    validate (input) {
      return !!input || 'do input a nickname!'
    }
  }).then(it => it.nickname)

  spinner.start('creating customer')
  await db('customer')
    .insert({
      email,
      pwd_hash: pwdHash,
      mobile,
      first_name: args.first_name,
      last_name: args.last_name,
      avatar,
      title,
      nickname
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
