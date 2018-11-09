#!/usr/bin/env node
const C = require('chance').Chance()
const objectizeArr = require('objectize-arr')
const exec = require('../util/exec')
const R = require('ramda')
const faker = require('faker')
faker.locale = 'zh_CN'

let customers = [
  [
    'kirk@enterprise.com',
    'kirk',
    '18888888888',
    faker.name.lastName(),
    faker.name.firstName(),
    faker.internet.userName(),
    'Mr',
    'https://cdn.vuetifyjs.com/images/lists/1.jpg'
  ],
  [
    'chekov@enterprise.com',
    'chekov',
    '17777777777',
    faker.name.lastName(),
    faker.name.firstName(),
    faker.internet.userName(),
    'Mr',
    'https://cdn.vuetifyjs.com/images/lists/1.jpg'
  ],
  [
    'spock@customer.com',
    'spock',
    '16666666666',
    faker.name.lastName(),
    faker.name.firstName(),
    faker.internet.userName(),
    'Mr',
    'https://cdn.vuetifyjs.com/images/lists/1.jpg'
  ]
].map(objectizeArr(['email', 'password', 'mobile', 'first_name', 'last_name', 'nickname', 'title', 'avatar']))

let formen = [
  ['yaopeng@wellliving.biz', 'yaopeng', faker.name.lastName(), faker.name.firstName(), '15655555955', 'active'],
  ['guopeng@wellliving.biz', 'guopeng', faker.name.lastName(), faker.name.firstName(), '14844447444', 'inactive'],
  ['lihu@wellliving.biz', 'lihu', faker.name.lastName(), faker.name.firstName(), '13933333633', 'inactive']
].map(objectizeArr(['email', 'password', 'first_name', 'last_name', 'mobile', 'status']))

let companies = require('../data/companies')
  .map(objectizeArr(['name', 'phone', 'email', 'lnglat', 'logo', 'profileImage', 'policy', 'address', 'website', 'description', 'city_id']))

let skuCategories = [
  ['橱柜'], ['镜柜'], ['桌椅组合'], ['沙发'], ['桌子'], ['地板'], ['灯具'], ['床'], ['水龙头']
].map(objectizeArr(['name']))

let cities = [
  ['北京市', '010'],
  ['上海市', '021'],
  ['广州市', '020'],
  ['深圳市', '0755'],
  ['杭州市', '0571'],
  ['合肥市', '0551'],
  ['苏州市', '0512'],
  ['南京市', '025']
].map(objectizeArr(['name', 'citycode']))

let skus = require('../data/skus')

const supplierEmails = [
  'tianshuangshuang',
  'guopeng',
  'lihu',
  'yaopeng'
]
const supplierNames = [
  '红星美凯龙',
  '居然之家',
  '欧亚达',
  '百安居'
]
let suppliers = R.range(0, 4).map(i => ({
  name: supplierNames[i],
  email: `${supplierEmails[i]}@wellliving.biz`,
  mobile: C.phone(),
  address: C.address()
}))

exec('./script/initialize.sh')

for (let customer of customers) {
  exec('./script/add-customer.js', customer)
}

for (let foreman of formen) {
  exec('./script/add-foreman.js', foreman)
}

const honors = [['首选'], ['热门']].map(objectizeArr(['name']))
for (let honor of honors) {
  exec('./script/add-company-honor.js', honor)
}

for (let cate of skuCategories) {
  exec('./script/add-sku-category.js', cate)
}

for (let sku of skus) {
  exec('./script/add-sku.js', sku)
}

for (let supplier of suppliers) {
  exec('./script/add-supplier.js', supplier)
}

for (let city of cities) {
  exec('./script/add-city.js', city)
}

let brands = [
  '全友',
  '齐心',
  '澳玛',
  '巨田',
  '迪美斯',
  '大恒',
  '吉美',
  '好风景',
  '阳光林森',
  '香迪',
  '宝莱佳',
  '环宇',
  '鑫其诺',
  '烛光皇朝',
  '科勒',
  '法恩莎',
  '恒洁',
  '金牌',
  'TOTO',
  '箭牌',
  '金迪',
  '格美',
  '颐达',
  '圣象',
  '大自然',
  '生活家',
  '久盛',
  '安信',
  '航标',
  '盛世美洁',
  '青青布艺',
  '亿百盛',
  '美的',
  '海信',
  '三星'
].map(name => ({ name }))

for (let brand of brands) {
  exec('./script/add-brand.js', brand)
}

let accounts = []
for (let company of companies) {
  exec('./script/add-company.js', company)
  exec('./script/initialize-company.js', {
    email: 'admin@' + company.email,
    password: company.name
  }, [company.name])
  let _accounts = [
    [`dispatcher@${company.email}`, 'dispatcher', 'dispatcher', company.name, faker.name.lastName(), faker.name.firstName(), faker.internet.userName()],
    [`salesperson@${company.email}`, 'salesperson', 'salesperson', company.name, faker.name.lastName(), faker.name.firstName(), faker.internet.userName()],
    [`designer@${company.email}`, 'designer', 'designer', company.name, faker.name.lastName(), faker.name.firstName(), faker.internet.userName()],
    [`accountant@${company.email}`, 'accountant', 'accountant', company.name, faker.name.lastName(), faker.name.firstName(), faker.internet.userName()]
  ].map(objectizeArr(['email', 'role', 'password', 'company', 'first_name', 'last_name', 'nickname']))
  accounts = accounts.concat(_accounts)
  for (let account of _accounts) {
    exec('./script/add-account.js', account)
  }
  exec('./script/fake-appointments.js', { company: company.name })
  exec('./script/fake-materials.js', { company: company.name })
  exec('./script/fake-orders.js', { company: company.name })
}

const fs = require('fs')

fs.writeFileSync('fake-data.log', JSON.stringify({
  customers, formen, companies, accounts, skus, brands, suppliers, cities
}, null, 4), { encoding: 'utf-8' })
