#!/usr/bin/env node
require('dotenv-flow').config()
require('../util/check-env').checkEnv()
const { camelize } = require('casing')
const db = require('../config/db')

function createIdentity ({ name }) {
  return db.insert({ name })
    .into('identity')
    .returning('*')
    .then(it => camelize(it[0]))
}

module.exports = createIdentity
