const { camelize, snakeize } = require('casing')
const { camelize: camelizeKey } = require('underscore.string.fp')
const R = require('ramda')
const layerify = require('layerify')
const db = require('../config/db')
const { $ } = require('../db-models')
const { queryObject } = require('../util/object-query')
const queryFields = require('../util/query-fields')
const { ERROR_CODES: { INVALID_ARGUMENTS }, ERROR_MESSAGES } = require('../config/errors')

exports.addMaterial = async function addMaterial (root, args, context) {
  let materialData = snakeize(args.input)
  materialData.company_id = context.auth.account.company.id
  for (let table of [$.sku$, $.brand$]) {
    let existObj = await queryObject(table, { id: materialData[table + '_id'] })
    if (!existObj) {
      return {
        error: {
          code: INVALID_ARGUMENTS,
          message: `${ERROR_MESSAGES.NOT_EXIST.en} ${table}`,
          message_cn: `${table}${ERROR_MESSAGES.NOT_EXIST.cn}`,
          locations: [{
            field: `${table}Id`,
            reason: `${ERROR_MESSAGES.NOT_EXIST.en} ${table}Id`,
            reason_cn: `${table}Id${ERROR_MESSAGES.NOT_EXIST.cn}`
          }]
        }
      }
    }
  }

  for (let it of [
    { table: $.supplier_2_company$, field: 'supplier_id', param: 'supplier_id' },
    { table: $.unit$, field: 'id', param: 'unit_id' }
  ]) {
    let [existObj] = await db(it.table)
      .where({ [it.field]: materialData[it.param], company_id: materialData.company_id })
    if (!existObj) {
      return {
        error: {
          code: INVALID_ARGUMENTS,
          message: `${ERROR_MESSAGES.NOT_EXIST.en} ${camelizeKey(it.param)}`,
          message_cn: `${camelizeKey(it.param)}${ERROR_MESSAGES.NOT_EXIST.cn}`,
          locations: [{
            field: `${camelizeKey(it.param)}`,
            reason: `${ERROR_MESSAGES.NOT_EXIST.en} ${camelizeKey(it.param)}`,
            reason_cn: `${camelizeKey(it.param)}${ERROR_MESSAGES.NOT_EXIST.cn}`
          }]
        }
      }
    }
  }
  // Check name duplication
  let [dupName] = await db($.material$).where({ name: materialData.name })
  if (dupName) {
    return {
      error: {
        code: INVALID_ARGUMENTS,
        message: `name ${ERROR_MESSAGES.DUPLICATE.en}`,
        message_cn: `名称${ERROR_MESSAGES.DUPLICATE.cn}`,
        locations: [{
          field: 'name',
          reason: `name ${ERROR_MESSAGES.DUPLICATE.en}`,
          reason_cn: `名称${ERROR_MESSAGES.DUPLICATE.cn}`
        }]
      }
    }
  }
  let [material] = await db($.material$)
    .insert(materialData)
    .returning('*')
    .then(camelize)
  if (material) {
    material.sku = await queryObject($.sku$, { id: material.skuId })
    material.sku.skuCategory = await queryObject($.sku_category$, { id: material.sku.skuCategoryId })
    material.supplier = await queryObject($.supplier$, { id: material.supplierId })
    material.brand = await queryObject($.brand$, { id: material.brandId })
    material.unit = await queryObject($.unit$, { id: material.unitId })
  }
  return { material }
}

exports.editMaterial = async function editMaterial (root, { id, input }) {
  let dbConn = db($.material$).where({ id })
  let skuBrandTableArray = []
  input.skuId && skuBrandTableArray.push($.sku$)
  input.brandId && skuBrandTableArray.push($.brand$)

  let materialData = snakeize(input)
  for (let table of skuBrandTableArray) {
    let existObj = await queryObject(table, { id: materialData[table + '_id'] })
    if (!existObj) {
      return {
        error: {
          code: INVALID_ARGUMENTS,
          message: `${ERROR_MESSAGES.NOT_EXIST.en} ${table}`,
          message_cn: `${table}Id${ERROR_MESSAGES.NOT_EXIST.cn}`,
          locations: [{
            field: `${table}Id`,
            reason: `${ERROR_MESSAGES.NOT_EXIST.en} ${table}Id`,
            reason_cn: `${table}Id${ERROR_MESSAGES.NOT_EXIST.cn}`
          }]
        }
      }
    }
  }
  let supplierUnitTableArray = []
  input.supplierId && supplierUnitTableArray
    .push({ table: $.supplier_2_company$, field: 'supplier_id', param: 'supplier_id' })
  input.unitId && supplierUnitTableArray
    .push({ table: $.unit$, field: 'id', param: 'unit_id' })

  for (let it of supplierUnitTableArray) {
    let [existObj] = await db(it.table)
      .where({ [it.field]: materialData[it.param], company_id: materialData.company_id })
    if (!existObj) {
      return {
        error: {
          code: INVALID_ARGUMENTS,
          message: `${ERROR_MESSAGES.NOT_EXIST.en} ${camelizeKey(it.param)}`,
          message_cn: `${camelizeKey(it.param)}${ERROR_MESSAGES.NOT_EXIST.cn}`,
          locations: [{
            field: `${camelizeKey(it.param)}`,
            reason: `${ERROR_MESSAGES.NOT_EXIST.en} ${camelizeKey(it.param)}`,
            reason_cn: `${camelizeKey(it.param)}${ERROR_MESSAGES.NOT_EXIST.cn}`
          }]
        }
      }
    }
  }

  if (materialData.name) {
    let [dupName] = await db($.material$)
      .where({ name: materialData.name })
      .andWhereNot({ id })
    if (dupName) {
      return {
        error: {
          code: INVALID_ARGUMENTS,
          message: `name ${ERROR_MESSAGES.DUPLICATE.en}`,
          message_cn: `名称${ERROR_MESSAGES.DUPLICATE.cn}`,
          locations: [{
            field: 'name',
            reason: `name ${ERROR_MESSAGES.DUPLICATE.en}`,
            reason_cn: `名称${ERROR_MESSAGES.DUPLICATE.cn}`
          }]
        }
      }
    }
  }

  // Update with an empty object will cause error
  !R.isEmpty(materialData) && dbConn.update(materialData)
  let [material] = await dbConn.returning('*')
    .then(camelize)
  if (material) {
    material.sku = await queryObject($.sku$, { id: material.skuId })
    material.sku.skuCategory = await queryObject($.sku_category$, { id: material.sku.skuCategoryId })
    material.supplier = await queryObject($.supplier$, { id: material.supplierId })
    material.brand = await queryObject($.brand$, { id: material.brandId })
    material.unit = await queryObject($.unit$, { id: material.unitId })
  }
  return { material }
}

exports.removeMaterial = async function removeMaterial (root, { id }) {
  let count = await db($.material$).where({ id }).del()
  return { count }
}

exports.getMaterial = async function getMaterial (root, { id }) {
  let [material] = await db($.material$)
    .leftJoin($.sku$, { [$.sku.id]: $.material.sku_id })
    .leftJoin($.sku_category$, { [$.sku_category.id]: $.sku.sku_category_id })
    .leftJoin($.supplier$, { [$.supplier.id]: $.material.supplier_id })
    .leftJoin($.brand$, { [$.brand.id]: $.material.brand_id })
    .leftJoin($.unit$, { [$.unit.id]: $.material.unit_id })
    .where({ [$.material.id]: id })
    .select([
      $.material._,
      ...queryFields($.sku$),
      ...queryFields($.sku_category$, [$.sku$]),
      ...queryFields($.brand$),
      ...queryFields($.supplier$),
      ...queryFields($.unit$)
    ])
    .then(R.map(layerify))
    .then(camelize)
  material.roomTypes = await db($.room_type$)
    .leftJoin($.material_2_room_type$, $.room_type.id, $.material_2_room_type.room_type_id)
    .where($.material_2_room_type.material_id, material.id)
    .select($.room_type._)
    .then(camelize)

  return material
}

exports.materialList = async function materialList (root, { offset, limit, filter = {} }) {
  let dbConn = db($.material$)
    .join($.sku$, $.sku.id, $.material.sku_id)
    .join($.supplier$, $.supplier.id, $.material.supplier_id)
    .join($.brand$, $.brand.id, $.material.brand_id)
    .join($.unit$, $.unit.id, $.material.unit_id)
    .leftJoin($.sku_category$, $.sku_category.id, $.sku.sku_category_id)

  filter.companyId && dbConn.where($.material.company_id, filter.companyId)
  filter.keyword && dbConn.where(function () {
    this.where($.sku.name, 'ilike', '%' + filter.keyword + '%')
  })
  filter.brandId && dbConn.where($.material.brand_id, filter.brandId)
  filter.supplierId && dbConn.where($.material.supplier_id, filter.supplierId)
  filter.categoryId && dbConn.where($.sku.sku_category_id, filter.categoryId)
  filter.roomTypeId && dbConn.whereExists(db($.material_2_room_type$)
    .whereRaw(`${$.material_2_room_type.room_type_id} = ${filter.roomTypeId}`)
    .andWhereRaw(`${$.material_2_room_type.material_id} = ${$.material.id}`)
  )

  let [{ count }] = await dbConn.clone().count()
  dbConn
    .select([
      $.material._,
      ...queryFields($.sku$),
      ...queryFields($.sku_category$, [$.sku$]),
      ...queryFields($.brand$),
      ...queryFields($.unit$),
      ...queryFields($.supplier$)
    ])
  limit && dbConn.limit(limit)
  offset && dbConn.offset(offset)
  let list = await dbConn
    .then(R.map(layerify))
    .then(camelize)
  for (let material of list) {
    material.roomTypes = await db($.room_type$)
      .leftJoin($.material_2_room_type$, $.room_type.id, $.material_2_room_type.room_type_id)
      .where($.material_2_room_type.material_id, material.id)
      .select($.room_type._)
      .then(camelize)
  }
  return { count, list }
}
