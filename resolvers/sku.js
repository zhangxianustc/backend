const db = require('../config/db')
const { $ } = require('../db-models')
const { camelize } = require('casing')
const R = require('ramda')
const layerify = require('layerify')
const queryFields = require('../util/query-fields')

async function skuList (root, { offset, limit, filter = {}, sortBy }) {
  sortBy = sortBy ? [$.sku$ + '.' + sortBy.key, sortBy.order] : [$.sku.name, 'DESC']
  let dbConn = db($.sku$)
    .leftJoin($.sku_category$, $.sku_category.id, $.sku.sku_category_id)
  filter.keyword && dbConn.where(function () {
    this.where($.sku.name, 'ilike', '%' + filter.keyword + '%')
      .orWhere($.sku.code, 'ilike', '%' + filter.keyword + '%')
  })
  let [{ count }] = await dbConn.clone().count()
  offset && dbConn.offset(offset)
  limit && dbConn.limit(limit)

  let list = await dbConn
    .select(
      $.sku._,
      ...queryFields($.sku_category$)
    )
    .orderBy(...sortBy)
    .then(R.map(layerify))
    .then(camelize)
  return { count, list }
}

function skuCategoryList () {
  return db($.sku_category$)
    .then(camelize)
}

module.exports = {
  skuList,
  skuCategoryList
}
