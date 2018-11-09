const { camelize, snakeize } = require('casing')
const R = require('ramda')
const { underscored } = require('underscore.string.fp')
const db = require('../config/db')
const { $ } = require('../db-models')
const geolib = require('geolib')
const layerify = require('layerify')
const queryFields = require('../util/query-fields')
const { ERROR_CODES: { INVALID_ARGUMENTS }, ERROR_MESSAGES } = require('../config/errors')

exports.getCompany = async function (root, query) {
  if (R.isEmpty(query)) {
    return {
      error: {
        code: INVALID_ARGUMENTS,
        message: `id or name ${ERROR_MESSAGES.MUST_BE_PROVIDED_ONE.en}`,
        message_cn: `ID或名称${ERROR_MESSAGES.MUST_BE_PROVIDED_ONE.cn}`,
        locations: [
          {
            field: 'id',
            reason: `${ERROR_MESSAGES.NOT_EXIST.en} id`,
            reason_cn: `id${ERROR_MESSAGES.NOT_EXIST.cn}`
          },
          {
            field: 'name',
            reason: `${ERROR_MESSAGES.NOT_EXIST.en} name`,
            reason_cn: `名称${ERROR_MESSAGES.NOT_EXIST.cn}`
          }
        ]
      }
    }
  }

  let dbConn = db($.company$)
    .join($.city$, $.city.id, $.company.city_id)
  query.id && dbConn.where($.company.id, query.id)
  query.name && dbConn.where($.company.name, query.name)
  let [company] = await dbConn
    .select([
      $.company._,
      ...queryFields($.city$)
    ])
    .then(R.map(layerify))
    .then(camelize)
  return { company }
}

exports.addCompany = async function addCompany (root, args) {
  const companyData = snakeize(args.input)
  const { name } = companyData
  const [existingOrg] = await db($.company$)
    .where({ name })

  if (existingOrg) {
    return {
      error: {
        code: INVALID_ARGUMENTS,
        message: `name ${ERROR_MESSAGES.DUPLICATE.en}`,
        message_cn: `名称${ERROR_MESSAGES.DUPLICATE.cn}`,
        locations: [
          {
            field: 'name',
            reason: `name ${ERROR_MESSAGES.DUPLICATE.en}`,
            reason_cn: `名称${ERROR_MESSAGES.DUPLICATE.cn}`
          }
        ]
      }
    }
  }
  let [company] = await db($.company$)
    .insert(companyData)
    .returning('*')
    .then(camelize)

  company.city = await db($.city$)
    .where({ id: company.cityId })
    .then(it => camelize(it[0]))
  return { company }
}

exports.companyList = async function companyList (root, { offset, limit, filter = {}, sortBy }) {
  let sortByDistance = sortBy && sortBy.key === 'distance'
  if (sortByDistance && !filter.currentGeo) {
    return {
      error: {
        code: INVALID_ARGUMENTS,
        message: `currentGeo ${ERROR_MESSAGES.IS_REQUIRED.en}`,
        message_cn: `${ERROR_MESSAGES.IS_REQUIRED.cn}当前位置`,
        locations: [{
          field: 'currentGeo',
          reason: `currentGeo ${ERROR_MESSAGES.IS_REQUIRED.en}`,
          reason_cn: `${ERROR_MESSAGES.IS_REQUIRED.cn}当前位置`
        }]
      }
    }
  }

  sortBy = sortBy ? [$.company$ + '.' + underscored(sortBy.key), sortBy.order] : [$.company.rating, 'DESC']
  let dbConn = db($.company$)
    .join($.city$, $.city.id, $.company.city_id)
  filter.keyword && dbConn.where(function () {
    this.where($.company.name, 'ilike', '%' + filter.keyword + '%')
      .orWhere($.company.description, 'ilike', '%' + filter.keyword + '%')
  })
  filter.cityId && dbConn.where({ city_id: filter.cityId })
  let [{ count }] = await dbConn.clone().count()

  let list = []
  if (sortByDistance) {
    list = await dbConn
      .select([
        $.company._,
        ...queryFields($.city$)
      ])
      .then(R.map(layerify))
      .then(camelize)

    list.forEach(function (it) {
      it.distance = geolib.getDistance(Object.assign({}, filter.currentGeo), it)
    })

    list.sort((a, b) => {
      return a.distance - b.distance
    })
    offset && list.splice(0, offset)
    limit && list.splice(limit)
  } else {
    limit && dbConn.limit(limit)
    offset && dbConn.offset(offset)
    list = await dbConn
      .select([
        $.company._,
        ...queryFields($.city$)
      ])
      .orderBy(...sortBy)
      .then(R.map(layerify))
      .then(camelize)

    if (filter.currentGeo) {
      R.map(function (it) {
        it.distance = geolib.getDistance(Object.assign({}, filter.currentGeo), it)
      }, list)
    }
  }

  return { count, list }
}

exports.foremanCompanyList = async function (root, { offset, limit, foremanId, sortBy }) {
  sortBy = sortBy ? [$.company$ + '.' + underscored(sortBy.key), sortBy.order] : [$.company.rating, 'DESC']

  let dbConn = db($.foreman_2_company$)
    .join($.company$, $.company.id, $.foreman_2_company.company_id)
    .where($.foreman_2_company.foreman_id, foremanId)
  let [{ count }] = await dbConn.clone().count()

  limit && dbConn.limit(limit)
  offset && dbConn.offset(offset)

  let list = await dbConn
    .select($.company._)
    .orderBy(...sortBy)
    .then(camelize)
  let orders = await db($.order$)
    .whereIn($.order.company_id, R.map(it => it.id, list))
    .andWhere($.order.foreman_id, foremanId)
    .then(camelize)
    .then(R.groupBy(it => it.companyId))
  list.forEach(company => {
    company.orderCount = orders[company.id] ? orders[company.id].length : 0
  })

  return { count, list }
}

exports.resolverMap = {
  Company: {
    honors (company, root, context) {
      return db($.company_2_honor$)
        .join($.company_honor$, $.company_honor.id, $.company_2_honor.honor_id)
        .where($.company_2_honor.company_id, company.id)
        .select(
          $.company_2_honor.id,
          $.company_honor.name,
          $.company_2_honor.bind_at
        )
        .then(camelize)
    }
  }
}
