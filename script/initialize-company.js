#!/usr/bin/env node
require('dotenv-flow').config()
require('../util/check-env').checkEnv()
const minimist = require('minimist')
const db = require('../config/db')
const inquirer = require('inquirer')
const logger = require('../logger')
const ora = require('ora')
const createRole = require('./create-role')
const createAccount = require('./create-account')
const emailRegex = require('email-regex')
const loadPolicy = require('../util/load-policy')
const R = require('ramda')
const C = require('chance').Chance()
const {
  BALANCE_CATEGORIES,
  BUITIN_FINANCIAL_INCOME_SUBJECTS,
  BUITIN_FINANCIAL_EXPENSE_SUBJECTS
} = require('../const')

const USAGE = `
  Usage: initialize-company.js <company name> <Options>

  initialize company's schema, this is the first script
  to run when you set up an company

  Options:

    -h, --help            show this help
    -e, --email           super admin's email
    -p, --password        super admin's password
`

let exit = code => {
  console.log(USAGE)
  process.exit(code)
}

let args = minimist(process.argv.slice(2), {
  alias: {
    h: 'help',
    e: 'email',
    p: 'password'
  }
})

args.h && exit(0)

let { _: [companyName] } = args

console.log(args)

!companyName && exit(1)

let spinner = ora()

db.transaction(function (trx) {
  return (async function () {
    let [company] = await trx('company')
      .where({ name: companyName })
    if (!company) {
      throw new Error('company ' + companyName + ' doesn\'t exist')
    }

    spinner.start('creating built in roles')
    let policy = await loadPolicy(company.policy)
    for (let [ name, { identity, needs } ] of R.toPairs(policy.built_in_roles)) {
      let role = await createRole({
        name,
        identity: policy.built_in_identities[identity],
        companyId: company.id,
        builtIn: true
      }, trx)
      if (needs && !R.isEmpty(needs)) {
        let _needs = await trx('need')
          .whereIn('value', needs)
        if (_needs.length !== needs.length) {
          let missing = []
          for (let need of needs) {
            if (_needs.map(it => it.value).indexOf(need) === -1) {
              missing.push(need)
            }
          }
          throw new Error('no such needs for role ' + name + ' :' + missing.join(','))
        }
        await trx('need_2_role')
          .insert(_needs.map(need => ({
            role_id: role.id,
            need_id: need.id
          })))
      }
    }
    let financialSubjectsData = []
    financialSubjectsData = financialSubjectsData.concat(
      Object.values(BUITIN_FINANCIAL_INCOME_SUBJECTS)
        .map(it => ({ name: it, balance_category: BALANCE_CATEGORIES.INCOME, company_id: company.id }))
    )
    financialSubjectsData = financialSubjectsData.concat(
      Object.values(BUITIN_FINANCIAL_EXPENSE_SUBJECTS)
        .map(it => ({ name: it, balance_category: BALANCE_CATEGORIES.EXPENSE, company_id: company.id }))
    )

    await trx('financial_subject').insert(financialSubjectsData)

    await trx('room_type').insert(policy.room_types.map(name => ({
      name, company_id: company.id
    })))
    await trx('unit').insert(policy.units.map(name => ({
      name,
      company_id: company.id
    })))
    const foremanList = await db('foreman')
    await trx('foreman_2_company').insert({
      foreman_id: C.pickone(foremanList).id,
      company_id: company.id
    })
    const supplierList = await db('supplier')
    await trx('supplier_2_company').insert({
      supplier_id: C.pickone(supplierList).id,
      company_id: company.id
    })
    const honorList = await db('company_honor')
    await trx('company_2_honor').insert(R.map(honor => ({
      honor_id: honor.id,
      company_id: company.id
    }), honorList))
    spinner.succeed()

    let { email, password } = args

    email = email || await inquirer.prompt({
      type: 'input',
      name: 'email',
      message: 'please input super administrator\'s email:',
      validate (input) {
        return (!!input && emailRegex({ exact: true }).test(input)) || 'do input an email!'
      }
    }).then(it => it.email)

    password = password || await inquirer.prompt({
      type: 'input',
      name: 'password',
      message: 'please input super administrator\'s password:',
      validate (input) {
        return !!input || 'do input a password!'
      }
    }).then(it => it.password)

    spinner.start(`creating super administrator`)
    await createAccount({
      email,
      password,
      isRoot: true,
      companyId: company.id
    }, [], trx)
    spinner.succeed()

    logger.warning('super administrator account information is: ', {
      email,
      password
    })
  })()
})
  .catch(e => {
    spinner.fail()
    logger.error(e)
    db.destroy()
    process.exit(1)
  })
  .then(() => {
    db.destroy()
  })
