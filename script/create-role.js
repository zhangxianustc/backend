#!/usr/bin/env node
require('dotenv-flow').config()
require('../util/check-env').checkEnv()
const { camelize, snakeize } = require('casing')
const db = require('../config/db')

function createRole (data, trx = db) {
  return trx.insert(snakeize(data))
    .into('role')
    .returning('*')
    .then(it => camelize(it[0]))
}

module.exports = createRole
