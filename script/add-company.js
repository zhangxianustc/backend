#!/usr/bin/env node
require('dotenv-flow').config()
require('../util/check-env').checkEnv()
const inquirer = require('inquirer')
const minimist = require('minimist')
const R = require('ramda')
const urlRegex = require('url-regex')
const db = require('../config/db')
const logger = require('../logger')
const ora = require('ora')
const globby = require('globby')
const basename = require('basename')

const USAGE = `

  Usage: add-company.js <options>

  add an company

  Options:

    -h, --help                            show help
    -n, --name <name>                     set name
    -o, --logo <logo_link>                set logo
    -a, --address <address>               set address
    -p, --policy <policy>                 set policy
    -d, --description [description]       optional, set description
    -l, --lnglat <lnglat>                 longitude and latitude
`

let args = minimist(process.argv.slice(2), {
  alias: {
    h: 'help',
    n: 'name',
    o: 'logo',
    a: 'address',
    d: 'description',
    p: 'policy',
    l: 'lnglat'
  }
})

if (args.h) {
  console.log(USAGE)
  process.exit(0)
}

let data = R.pick([
  'name',
  'logo',
  'description',
  'phone',
  'address',
  'website',
  'policy',
  'lnglat',
  'city_id'
], args)
data.profileImage = args['profile-image']
;(async function () {
  data.name = data.name || await inquirer.prompt({
    type: 'input',
    name: 'name',
    message: 'Input company\'s name:',
    validate (name) {
      return !!name || 'You should input a name!'
    }
  }).then(it => it.name)
  data.logo = data.logo || await inquirer.prompt({
    type: 'input',
    name: 'logo',
    message: 'Input company\'s logo:',
    validate (logo) {
      return (!!logo && urlRegex({ exact: true }).test(logo)) || 'You should input a valid logo url!'
    }
  }).then(it => it.logo)
  data.address = data.address || await inquirer.prompt({
    type: 'input',
    name: 'address',
    message: 'Input company\'s address:',
    validate (address) {
      return !!address || 'You should input an address'
    }
  }).then(it => it.address)
  data.policy = data.policy || await inquirer.prompt({
    type: 'list',
    name: 'policy',
    message: 'Input company\'s policy:',
    default: 'default',
    choices: await globby('./policy', {
      onlyFiles: true
    })
      .then(paths => paths.map(basename))
  }).then(it => it.policy)
  data.description = data.description || await inquirer.prompt({
    type: 'input',
    name: 'description',
    message: 'Input company\'s description (optional, press ENTER to bypass):'
  }).then(it => it.description)
  data.lnglat = data.lnglat || await inquirer.prompt([{
    type: 'input',
    name: 'longitude',
    message: 'Input company\'s longitude: '
  }, {
    type: 'input',
    name: 'latitude',
    message: 'Input company\'s latitude: '
  }])
    .then(it => it.longitude + ',' + it.latitude)
  let [longitude, latitude] = data.lnglat.split(',')
  delete data.lnglat
  data.longitude = longitude
  data.latitude = latitude
  data.profile_image = data.profileImage
  delete data.profileImage

  let spinner = ora()
  try {
    spinner.start('adding company...')
    await db('company').insert(data)
    spinner.succeed()
  } catch (e) {
    logger.error(e)
    spinner.fail()
    process.exit(1)
  } finally {
    db.destroy()
  }
})()
