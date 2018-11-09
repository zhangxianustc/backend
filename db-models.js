/**
 * all the tables should be put into public schema
 */
let tables = {}

tables.city = {
  id: t => t.increments('id'),
  name: t => t.string('name').notNullable(),
  citycode: t => t.string('citycode').unique().notNullable(),
  create_at: (t, db) => t.datetime('create_at').defaultTo(db.fn.now(6))
}

tables.company = {
  id: t => t.increments('id'),
  name: t => t.string('name').unique().notNullable(),
  logo: t => t.string('logo'),
  profile_image: t => t.string('profile_image'),
  description: t => t.text('description'),
  phone: t => t.string('phone'),
  address: t => t.text('address').notNullable(),
  website: t => t.string('website'),
  latitude: t => t.decimal('latitude'),
  longitude: t => t.decimal('longitude'),
  rating: t => t.integer('rating').defaultTo(50),
  authorized: t => t.boolean('authorized').defaultTo(false),
  policy: t => t.string('policy').defaultTo('default'),
  city_id: t => t.integer('city_id').references('city.id')
}

// Company accounts
tables.account = {
  id: t => t.increments('id'),
  email: t => t.string('email').unique().notNullable(),
  first_name: t => t.string('first_name'),
  middle_name: t => t.string('middle_name'),
  last_name: t => t.string('last_name'),
  nickname: t => t.string('nickname'),
  pwd_hash: t => t.string('pwd_hash'),
  is_root: t => t.boolean('is_root').defaultTo(false),
  status: t => t.string('status').defaultTo('active'),
  company_id: t => t.integer('company_id').references('company.id')
    .onDelete('CASCADE'),
  create_at: (t, db) => t.datetime('create_at').defaultTo(db.fn.now())
}

// why put role here, since company might customize roles themselves
// NOTE! role is used only by account
tables.role = {
  id: t => t.increments('id'),
  name: t => t.string('name').notNullable(),
  // all roles in a company will have a company id,
  company_id: t => t.integer('company_id').references('company.id')
    .onDelete('CASCADE'),
  identity: t => t.string('identity').notNullable(),
  built_in: t => t.boolean('built_in').defaultTo(false),
  '': t => t.unique(['name', 'company_id'])
}

// account may have many roles
tables.account_2_role = {
  account_id: t => t.integer('account_id')
    .references('account.id')
    .onDelete('CASCADE'),
  role_id: t => t.integer('role_id').references('role.id')
}

tables.foreman = {
  id: t => t.increments('id'),
  email: t => t.string('email').unique().notNullable(),
  first_name: t => t.string('first_name'),
  middle_name: t => t.string('middle_name'),
  last_name: t => t.string('last_name'),
  gender: t => t.integer('gender').defaultTo(1),
  mobile: t => t.string('mobile'),
  pwd_hash: t => t.string('pwd_hash'),
  photo: t => t.string('photo'),
  rating: t => t.integer('rating').defaultTo(50),
  status: t => t.string('status').defaultTo('inactive'),
  create_at: (t, db) => t.datetime('create_at').defaultTo(db.fn.now())
}

// Foreman and company relationships: many to many
tables.foreman_2_company = {
  id: t => t.increments('id'),
  foreman_id: t => t.integer('foreman_id').references('foreman.id')
    .onDelete('CASCADE'),
  company_id: t => t.integer('company_id').references('company.id')
    .onDelete('CASCADE'),
  bind_at: (t, db) => t.datetime('bind_at').defaultTo(db.fn.now())
}

tables.customer = {
  id: t => t.increments('id'),
  email: t => t.string('email').unique().notNullable(),
  mobile: t => t.string('mobile'),
  first_name: t => t.string('first_name'),
  middle_name: t => t.string('middle_name'),
  last_name: t => t.string('last_name'),
  suffix: t => t.string('suffix'),
  title: t => t.string('title'),
  nickname: t => t.string('nickname'),
  avatar: t => t.string('avatar'),
  pwd_hash: t => t.string('pwd_hash'),
  status: t => t.string('status').defaultTo('active'),
  create_at: (t, db) => t.datetime('create_at').defaultTo(db.fn.now()),
  update_at: t => t.datetime('update_at')
}

tables.appointment = {
  id: t => t.increments('id'),
  company_id: t => t.integer('company_id').references('company.id')
    .onDelete('CASCADE'),
  seq: (t, db) => t.string('seq').defaultTo(db.raw('to_char(CURRENT_TIMESTAMP, \'YYYYMMDDHH24MISSMS\'::text) || nextval(\'appt_seq\') % 999999')),
  last_name: t => t.string('last_name').notNullable(),
  title: t => t.string('title'),
  mobile: t => t.string('mobile').notNullable(),
  on_site: t => t.boolean('on_site').defaultTo(false),
  address: t => t.text('address'),
  meet_at: t => t.datetime('meet_at'),
  status: t => t.string('status').notNullable(),
  salesperson_id: t => t.integer('salesperson_id')
    .references('account.id'),
  memo: t => t.text('memo'),
  close_reason: t => t.text('close_reason'),
  create_at: (t, db) => t.datetime('create_at').defaultTo(db.fn.now(6))
}

tables.room_type = {
  id: t => t.increments('id'),
  company_id: t => t.integer('company_id').references('company.id').onDelete('CASCADE'),
  name: t => t.string('name').notNullable(),
  '': t => t.unique(['company_id', 'name'])
}

tables.unit = {
  id: t => t.increments('id'),
  name: t => t.string('name').notNullable(),
  company_id: t => t.integer('company_id').references('company.id'),
  '': t => t.unique(['company_id', 'name'])
}

tables.order = {
  id: t => t.increments('id'),
  company_id: t => t.integer('company_id').references('company.id')
    .onDelete('CASCADE'),
  seq: (t, db) => t.string('seq').unique()
    .defaultTo(db.raw('to_char(CURRENT_TIMESTAMP, \'YYYYMMDDHH24MISSMS\'::text) || nextval(\'order_seq\') % 999999')),
  decoration_type: t => t.string('decoration_type').defaultTo('全屋整装'),
  salesperson_id: t => t.integer('salesperson_id').references('account.id').notNullable(),
  designer_id: t => t.integer('designer_id').references('account.id'),
  total: t => t.integer('total').defaultTo(0),
  deposit: t => t.integer('deposit').defaultTo(0),
  paid: t => t.integer('paid').defaultTo(0),
  pending: t => t.integer('pending').defaultTo(0),
  currency: t => t.string('currency').notNullable(),
  status: t => t.string('status').notNullable(),
  customer_id: t => t.integer('customer_id').references('customer.id').notNullable()
    .onDelete('CASCADE'),
  zipcode: t => t.string('zipcode'),
  address: t => t.text('address'),
  total_area: t => t.integer('total_area'),
  total_area_unit_id: t => t.integer('total_area_unit_id').references('unit.id'),
  creator_id: t => t.integer('creator_id').references('account.id'),
  foreman_id: t => t.integer('foreman_id')
    .references('foreman.id'),
  estimated_start_date: t => t.date('estimated_start_date'),
  contract_urls: t => t.specificType('contract_urls', 'text[]'),
  down_payment_amount: t => t.integer('down_payment_amount'),
  interim_payment_amount: t => t.integer('interim_payment_amount'),
  retainage_payment_amount: t => t.integer('retainage_payment_amount'),
  down_payment_receipt_urls: t => t.specificType('down_payment_receipt_urls', 'text[]'),
  interim_payment_receipt_urls: t => t.specificType('interim_payment_receipt_urls', 'text[]'),
  retainage_payment_receipt_urls: t => t.specificType('retainage_payment_receipt_urls', 'text[]'),
  create_at: (t, db) => t.datetime('create_at').defaultTo(db.fn.now(6)),
  update_at: t => t.datetime('update_at'),
  finish_at: t => t.datetime('finish_at')
}

tables.order_evaluation = {
  id: t => t.increments('id'),
  order_id: t => t.integer('order_id').references('order.id').onDelete('CASCADE').notNullable(),
  salesperson_attitude_score: t => t.integer('salesperson_attitude_score'),
  salesperson_attitude_comment: t => t.text('salesperson_attitude_comment'),
  design_style_score: t => t.integer('design_style_score'),
  design_style_comment: t => t.text('design_style_comment'),
  construction_quality_score: t => t.integer('construction_quality_score'),
  construction_quality_comment: t => t.text('construction_quality_comment'),
  create_at: (t, db) => t.datetime('create_at').defaultTo(db.fn.now(6))
}

tables.room_4_order = {
  id: t => t.increments('id'),
  type_id: t => t.integer('type_id').references('room_type.id').onDelete('CASCADE'),
  quantity: t => t.integer('quantity').defaultTo(0),
  order_id: t => t.integer('order_id').references('order.id').onDelete('CASCADE')
}

tables.supplier = {
  id: t => t.increments('id'),
  name: t => t.string('name').unique().notNullable(),
  email: t => t.string('email').unique().notNullable(),
  mobile: t => t.string('mobile').notNullable(),
  address: t => t.text('address'),
  create_at: (t, db) => t.datetime('create_at').defaultTo(db.fn.now(6))
}

tables.supplier_2_company = {
  supplier_id: t => t.integer('supplier_id').references('supplier.id')
    .onDelete('CASCADE'),
  company_id: t => t.integer('company_id').references('company.id')
    .onDelete('CASCADE'),
  bind_at: (t, db) => t.datetime('bind_at').defaultTo(db.fn.now())
}

tables.brand = {
  id: t => t.increments('id'),
  name: t => t.string('name').notNullable()
}

tables.sku_category = {
  id: t => t.increments('id'),
  name: t => t.string('name').notNullable()
}

tables.sku = {
  id: t => t.increments('id'),
  name: t => t.string('name').notNullable(),
  code: t => t.string('code').notNullable(),
  dimension: t => t.text('dimension'),
  texture: t => t.text('texture'),
  desc: t => t.text('desc'),
  images: t => t.specificType('images', 'text[]'),
  sku_category_id: t => t.integer('sku_category_id').references('sku_category.id')
}

tables.material = {
  id: t => t.increments('id'),
  name: t => t.string('name').notNullable(),
  sku_id: t => t.integer('sku_id').references('sku.id')
    .onDelete('CASCADE'),
  supplier_id: t => t.integer('supplier_id').references('supplier.id')
    .onDelete('CASCADE'),
  brand_id: t => t.integer('brand_id').references('brand.id')
    .onDelete('CASCADE'),
  purchase_price: t => t.integer('purchase_price').defaultTo(0),
  sale_price: t => t.integer('sale_price').defaultTo(0),
  market_price: t => t.integer('market_price').defaultTo(0),
  currency: t => t.string('currency').notNullable(),
  unit_id: t => t.integer('unit_id').references('unit.id'),
  supply_cycle_in_days: t => t.integer('supply_cycle_in_days').defaultTo(0),
  images: t => t.specificType('images', 'text[]'),
  company_id: t => t.integer('company_id').references('company.id')
    .onDelete('CASCADE'),
  create_at: (t, db) => t.datetime('create_at').defaultTo(db.fn.now(6)),
  '': t => t.unique(['name', 'company_id'])
}

tables.material_2_room_type = {
  id: t => t.increments('id'),
  material_id: t => t.integer('material_id').references('material.id')
    .onDelete('CASCADE'),
  room_type_id: t => t.integer('room_type_id').references('room_type.id').onDelete('CASCADE')
}

tables.service_module = {
  id: t => t.increments('id'),
  name: t => t.string('name').notNullable(),
  type: t => t.string('type').notNullable(),
  order_id: t => t.integer('order_id').references('order.id').onDelete('CASCADE'),
  '': t => t.unique(['name', 'order_id'])
}

// 订单所选材料
tables.order_material = {
  id: t => t.increments('id'),
  // 用来区分同一订单不同批次选择的材料
  batch_no: t => t.string('batch_no').notNullable(),
  module_id: t => t.integer('module_id').references('service_module.id').onDelete('CASCADE'),
  material_id: t => t.integer('material_id').references('material.id').notNullable(),
  name: t => t.string('name').notNullable(),
  brand: t => t.string('brand').notNullable(),
  supplier_id: t => t.integer('supplier_id').references('supplier.id')
    .onDelete('CASCADE'),
  sku_id: t => t.integer('sku_id').references('sku.id').onDelete('CASCADE'),
  quantity: t => t.integer('quantity').defaultTo(0),
  unit: t => t.string('unit').notNullable(),
  // 销售单价 对应于material的sale_price
  sale_price: t => t.integer('sale_price').defaultTo(0),
  // 进价 对应于material的purchase_price
  purchase_price: t => t.integer('purchase_price').defaultTo(0),
  currency: t => t.string('currency').notNullable(),
  status: t => t.string('status').defaultTo('selected'),
  supply_cycle_in_days: t => t.integer('supply_cycle_in_days').defaultTo(0),
  accept_at: t => t.datetime('accept_at'),
  ship_at: t => t.datetime('ship_at')
}

tables.order_service = {
  id: t => t.increments('id'),
  // 用来区分同一订单不同批次的选择
  batch_no: t => t.string('batch_no').notNullable(),
  module_id: t => t.integer('module_id').references('service_module.id').onDelete('CASCADE'),
  name: t => t.string('name').notNullable(),
  amount: t => t.integer('amount').defaultTo(0),
  memo: t => t.text('memo')
}

// 供应商订单
tables.supplier_order = {
  id: t => t.increments('id'),
  seq: (t, db) => t.string('seq').unique()
    .defaultTo(db.raw('to_char(CURRENT_TIMESTAMP, \'YYYYMMDDHH24MISSMS\'::text) || nextval(\'supplier_order_seq\') % 999999')),
  supplier_id: t => t.integer('supplier_id').references('supplier.id'),
  company_id: t => t.integer('company_id').references('company.id')
    .onDelete('CASCADE'),
  company_order_id: t => t.integer('company_order_id').references('order.id').onDelete('CASCADE'),
  // 用来区分同一订单不同批次选择的材料: 对应于order_material.batch_no
  batch_no: t => t.string('batch_no').notNullable(),
  status: t => t.string('status').defaultTo('ordered'),
  memo: t => t.text('memo'),
  create_at: (t, db) => t.datetime('create_at').defaultTo(db.fn.now(6))
}
// 供应商订单材料详情表
tables.supplier_order_material = {
  id: t => t.increments('id'),
  supplier_order_id: t => t.integer('supplier_order_id').references('supplier_order.id')
    .onDelete('CASCADE')
    .notNullable(),
  // 对应于表order_material中ID，用于更新对应材料订单的状态
  company_order_material_id: t => t.integer('company_order_material_id').references('order_material.id').notNullable(),
  name: t => t.string('name').notNullable(),
  brand: t => t.string('brand').notNullable(),
  sku_id: t => t.integer('sku_id').references('sku.id').onDelete('CASCADE'),
  quantity: t => t.integer('quantity').defaultTo(0),
  unit: t => t.string('unit').notNullable(),
  // 进价 对应于material的purchase_price
  purchase_price: t => t.integer('purchase_price').defaultTo(0),
  currency: t => t.string('currency').notNullable(),
  eta: t => t.date('eta'),
  status: t => t.string('status').defaultTo('ordered'),
  supply_cycle_in_days: t => t.integer('supply_cycle_in_days').defaultTo(0),
  ship_at: t => t.datetime('ship_at'),
  accept_at: t => t.datetime('accept_at')
}

tables.need = {
  id: t => t.increments('id'),
  value: t => t.string('value').notNullable().unique()
}

tables.need_2_role = {
  need_id: t => t.integer('need_id').references('need.id').onDelete('CASCADE'),
  role_id: t => t.integer('role_id').references('role.id'),
  '': t => t.unique(['need_id', 'role_id'])
}

tables.financial_subject = {
  id: t => t.increments('id'),
  name: t => t.string('name').notNullable(),
  balance_category: t => t.string('balance_category').notNullable(),
  desc: t => t.text('desc'),
  company_id: t => t.integer('company_id').references('company.id')
    .onDelete('CASCADE')
    .notNullable(),
  '': t => t.unique(['name', 'company_id'])
}

tables.financial_statement = {
  id: t => t.increments('id'),
  order_id: t => t.integer('order_id').references('order.id')
    .notNullable(),
  financial_subject_id: t => t.integer('financial_subject_id').references('financial_subject.id')
    .notNullable(),
  amount: t => t.integer('amount').defaultTo(0),
  memo: t => t.text('memo'),
  creator_id: t => t.integer('creator_id').references('account.id').notNullable(),
  create_at: (t, db) => t.datetime('create_at').defaultTo(db.fn.now(6))
}

tables.service = {
  id: t => t.increments('id'),
  name: t => t.string('name').unique().notNullable(),
  cover_image_url: t => t.string('cover_image_url').notNullable()
}

tables.order_feedback = {
  id: t => t.increments('id'),
  type: t => t.string('type'),
  order_id: t => t.integer('order_id').references('order.id').onDelete('CASCADE'),
  content: t => t.string('content').notNullable(),
  creator_id: t => t.integer('creator_id').references('customer.id')
}

tables.app_feedback = {
  id: t => t.increments('id'),
  type: t => t.string('type'),
  content: t => t.string('content').notNullable(),
  version: t => t.string('version').notNullable(),
  role: t => t.string('role').notNullable(),
  creator_id: t => t.integer('creator_id')
}

tables.company_contact = {
  id: t => t.increments('id'),
  customer_id: t => t.integer('customer_id').references('customer.id'),
  foreman_id: t => t.integer('foreman_id').references('foreman.id'),
  company_id: t => t.integer('company_id').references('company.id'),
  name: t => t.string('name').notNullable(),
  phone: t => t.string('phone').notNullable(),
  content: t => t.string('content').notNullable(),
  create_at: (t, db) => t.datetime('create_at').defaultTo(db.fn.now(6))
}

tables.company_honor = {
  id: t => t.increments('id'),
  name: t => t.string('name').unique().notNullable()
}

tables.company_2_honor = {
  id: t => t.increments('id'),
  company_id: t => t.integer('company_id').references('company.id'),
  honor_id: t => t.integer('honor_id').references('company_honor.id'),
  bind_at: (t, db) => t.datetime('bind_at').defaultTo(db.fn.now(6))
}

tables.gallery = {
  id: t => t.increments('id'),
  description: t => t.text('description'),
  creator_id: t => t.integer('creator_id').references('foreman.id'),
  create_at: (t, db) => t.datetime('create_at').defaultTo(db.fn.now())
}

tables.asset = {
  id: t => t.increments('id'),
  url: t => t.string('url').notNullable(),
  create_at: (t, db) => t.datetime('create_at').defaultTo(db.fn.now()),
  extra: t => t.jsonb('extra'),
  gallery_id: t => t.integer('gallery_id').references('gallery.id').onDelete('CASCADE')
}

tables.task_progress = {
  id: t => t.increments('id'),
  order_id: t => t.integer('order_id').references('order.id').onDelete('CASCADE'),
  canonical_name: t => t.string('canonical_name').notNullable(),
  start_at: t => t.datetime('start_at'),
  start_arg: t => t.jsonb('start_arg'),
  finish_at: t => t.datetime('finish_at'),
  finish_arg: t => t.jsonb('finish_arg'),
  '': t => t.unique(['order_id', 'canonical_name'])
}

tables.order_log = {
  id: t => t.increments('id'),
  order_id: t => t.integer('order_id').references('order.id').onDelete('CASCADE'),
  title: t => t.string('title').notNullable(),
  create_at: (t, db) => t.datetime('create_at').defaultTo(db.fn.now()),
  '': t => t.unique(['order_id', 'title'])
}

tables.version_1 = {
  id: t => t.increments('id'),
  version_id: t => t.integer('version_id'),
  version_name: t => t.string('version_name')
}

tables.sub_version_1 = {
  id: t => t.increments('id'),
  version_id: t => t.integer('version_id'),
  sub_version_id: t => t.integer('sub_version_id'),
  sub_version_name: t => t.string('sub_version_name')
}

tables.version_2 = {
  id: t => t.increments('id'),
  versionid: t => t.integer('versionid'),
  version_name: t => t.string('version_name')
}

tables.sub_version_2 = {
  id: t => t.increments('id'),
  versionid: t => t.integer('versionid'),
  sub_version_id: t => t.integer('sub_version_id'),
  sub_version_name: t => t.string('sub_version_name')
}

let $ = new Proxy({}, {
  get (obj, prop) {
    if (prop in obj || typeof prop === 'symbol') {
      return obj[prop]
    }
    let tableName = prop
    let endsWith$ = tableName.endsWith('$')
    if (endsWith$) {
      tableName = tableName.slice(0, tableName.length - 1)
    }
    if (!tableName || !tables.hasOwnProperty(tableName)) {
      throw new Error('no such table: ' + tableName)
    }
    if (endsWith$) {
      return tableName
    }
    return new Proxy({}, {
      get (obj, prop) {
        if (prop in obj || typeof prop === 'symbol') {
          return obj[prop]
        }
        if (prop === '_') {
          return tableName + '.*'
        }
        if (!tables[tableName].hasOwnProperty(prop)) {
          throw new Error(`table ${tableName} has no such column: ${prop}`)
        }
        return tableName + '.' + prop
      }
    })
  }
})

module.exports = Object.assign({ $ }, tables)
