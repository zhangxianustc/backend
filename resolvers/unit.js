const db = require('../config/db')
const { $ } = require('../db-models')
const { camelize } = require('casing')

function getUnitList (root, { companyId }) {
  return db($.unit$)
    .where('company_id', companyId)
    .then(camelize)
}

module.exports = {
  getUnitList
}
