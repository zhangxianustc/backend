const db = require('../config/db')
const { $ } = require('../db-models')
const { camelize } = require('casing')

function brandList () {
  return db($.brand$)
    .then(camelize)
}

module.exports = {
  brandList
}
