const db = require('../config/db')
const { camelize } = require('casing')

exports.serviceList = () => db('service')
  .then(camelize)
