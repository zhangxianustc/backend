const { camelize, snakeize } = require('casing')
const R = require('ramda')
const { underscored } = require('underscore.string.fp')
const db = require('../config/db')
const { $ } = require('../db-models')
const { ERROR_CODES: { INVALID_ARGUMENTS }, ERROR_MESSAGES } = require('../config/errors')

exports.addCity = async function addCity (root, { input }) {
  let inputData = snakeize(input)
  if (R.isEmpty(inputData.name)) {
    return {
      error: {
        code: INVALID_ARGUMENTS,
        message: `city name ${ERROR_MESSAGES.IS_REQUIRED.en}`,
        message_cn: `城市名称${ERROR_MESSAGES.IS_REQUIRED.cn}`
      }
    }
  }
  if (R.isEmpty(inputData.citycode)) {
    return {
      error: {
        code: INVALID_ARGUMENTS,
        message: `citycode ${ERROR_MESSAGES.IS_REQUIRED.en}`,
        message_cn: `城市代码${ERROR_MESSAGES.IS_REQUIRED.cn}`
      }
    }
  }
  let [city] = await db($.city$)
    .insert(inputData)
    .returning('*')
    .then(camelize)
  return { city }
}

exports.cityList = async function cityList (root, { offset, limit, filter = {}, sortBy }) {
  sortBy = sortBy ? [$.city$ + '.' + underscored(sortBy.key), sortBy.order] : [$.city.citycode, 'ASC']
  let dbConn = db($.city$)
  filter.keyword && dbConn.where(function () {
    this.where($.city.name, 'ilike', '%' + filter.keyword + '%')
      .orWhere($.city.citycode, 'ilike', '%' + filter.keyword + '%')
  })
  offset && dbConn.offset(offset)
  limit && dbConn.limit(limit)
  let [{ count }] = await dbConn.clone().count()
  let list = await dbConn
    .select('*')
    .orderBy(...sortBy)
    .then(camelize)
  return { count, list }
}
