const { camelize } = require('casing')
const db = require('../config/db')
const { underscored } = require('underscore.string.fp')
const { $ } = require('../db-models')

exports.needList = async function needList (root, { offset, limit, filter = {}, sortBy }, context) {
  sortBy = sortBy ? [$.need$ + '.' + underscored(sortBy.key), sortBy.order] : [$.need.id]
  let dbConn = db($.need$)

  filter.keyword && dbConn.where(function () {
    this.where($.need.value, 'ilike', '%' + filter.keyword + '%')
  })
  let [{ count }] = await dbConn.clone().count()
  limit && dbConn.limit(limit)
  offset && dbConn.offset(offset)
  let list = await dbConn
    .orderBy(sortBy)
    .then(camelize)
  return { count, list }
}
