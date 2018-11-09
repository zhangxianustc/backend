const { camelize } = require('casing')
const db = require('../config/db')
const { underscored } = require('underscore.string.fp')
const { $ } = require('../db-models')
const roomTypeTable = 'room_type'

exports.getRoomType = async function getRoomType (root, { id }, context, trx = db) {
  let roomTypeQuery = { id, company_id: context.auth.account.company.id }
  let roomType = await trx(roomTypeTable)
    .where(roomTypeQuery)
    .then(it => it[0] ? camelize(it[0]) : null)
  return roomType
}

exports.roomTypeList = async function roomTypeList (root, { offset, limit, filter = {}, sortBy }, context) {
  sortBy = sortBy ? [underscored(sortBy.key), sortBy.order] : [$.room_type.name, 'ASC']
  let dbConn = db($.room_type$).where({ company_id: context.auth.account.company.id })
  filter.keyword && dbConn.where(function () {
    this.where($.room_type.name, 'ilike', '%' + filter.keyword + '%')
  })
  let [{ count }] = await dbConn.clone().count()
  limit && dbConn.limit(limit)
  offset && dbConn.offset(offset)
  sortBy && dbConn.orderBy(...sortBy)
  let list = await dbConn.then(camelize)
  return { count, list }
}
