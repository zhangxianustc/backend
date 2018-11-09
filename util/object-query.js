const { camelize } = require('casing')
const db = require('../config/db')
const models = require('../db-models')

/**
 * Customize query of a single object from a given table
 * @param table
 * @param query
 * @param trx db connection
 * @returns {Promise<void>}
 */
async function queryObject (table, query, trx = db) {
  if (!models.hasOwnProperty(table)) {
    throw new Error('no such table: ' + table)
  }

  let [object] = await trx(table)
    .where(query).then(camelize)
  return object
}

module.exports = { queryObject }
