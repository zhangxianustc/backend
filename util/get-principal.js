const yaml = require('js-yaml')
const db = require('../config/db')
const fs = require('fs-extra')
const R = require('ramda')
const getBasePrincipal = require('./get-base-principal')

var customerPrincipal
var foremanPrincipal

const BASE_POLICY_FILE_PATH = './policy/base.yml'

const getCustomerPrincipal = (function () {
  let customerPrincipal

  return async function getCustomerPrincipal () {
    if (!customerPrincipal) {
      let needs = await fs.readFile(BASE_POLICY_FILE_PATH, 'utf-8')
        .then(yaml.safeLoad)
        .then(R.path(['built_in_roles', 'customer', 'needs']))
      customerPrincipal = await getBasePrincipal()
        .then(p => p
          .clone()
          .setScope(needs.concat('be.customer'))
        )
    }
    return customerPrincipal
  }
})()

const getForemanPrincipal = (function () {
  let foremanPrincipal

  return async function getForemanPrincipal (trx = db) {
    if (!foremanPrincipal) {
      let needs = await fs.readFile(BASE_POLICY_FILE_PATH, 'utf-8')
        .then(yaml.safeLoad)
        .then(R.path(['built_in_roles', 'foreman', 'needs']))
      foremanPrincipal = await getBasePrincipal()
        .then(p => p
          .clone()
          .setScope(needs.concat('be.foreman'))
        )
    }
    return foremanPrincipal
  }
})()

async function getCompanyPrincipal (user, trx = db) {
  let needs = await trx('need')
    .join('need_2_role', 'need_2_role.need_id', 'need.id')
    .where('need_2_role.role_id', user.currentRole.id)
    .then(R.map(it => it.value))
    .then(it => it.concat(['be.' + user.currentRole.name, 'in.company']))
  // add all the roles in this company as principal's objects
  let roles = await trx('role')
    .where('company_id', user.company.id)
    .then(R.map(it => it.name))
  let p = (await getBasePrincipal()).clone()
  return roles.reduce(
    (p, role) => p.addObject(role), p
  ).setScope(needs)
}

async function getPrincipal (accountType, user, trx = db) {
  if (accountType === 'customer') {
    customerPrincipal = (customerPrincipal || await getCustomerPrincipal(trx))
    return customerPrincipal
  }
  if (accountType === 'foreman') {
    foremanPrincipal = (foremanPrincipal || await getForemanPrincipal(trx))
    return foremanPrincipal
  }
  return getCompanyPrincipal(user, trx)
}

module.exports = getPrincipal
