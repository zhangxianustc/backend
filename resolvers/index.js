const { createPermission } = require('principal-js')
const { getCompany, addCompany, companyList, foremanCompanyList, resolverMap: companyResolverMap } = require('./company')
const { ossStsToken, ossBucketInfo } = require('./oss')
const {
  loginAsCompany,
  doesEmailExist,
  companyAccounts,
  editCompanyAccount,
  switchCompanyAccountStatus,
  principal
} = require('./account')
const appointment = require('./appointment')
const order = require('./order')
const { getRoomType, roomTypeList } = require('./roomtype')
const customer = require('./customer')
const foreman = require('./foreman')
const { sendRegistrationEmail, sendChangeEmailVerificationCode } = require('./email')
const { addMaterial, editMaterial, removeMaterial, getMaterial, materialList } = require('./material')
const supplier = require('./supplier')
const financial = require('./financial')
const guard = require('../util/guard')
const GraphQLJSON = require('graphql-type-json')
const { getUnitList } = require('./unit')
const { brandList } = require('./brand')
const { skuList, skuCategoryList } = require('./sku')
const accountExists = require('../validators/account-exists')
const { createRole, editRole, getRole, roleList } = require('./role')
const { needList } = require('./need')
const { addCompanyContact, getCompanyContact, companyContactList } = require('./company-contact')
const { addCity, cityList } = require('./city')
const salespersonExists = require('../validators/salesperson-exists')
const customerExists = require('../validators/customer-exists')
const appointmentExists = require('../validators/appointment-exists')
const orderExists = require('../validators/order-exists')
const modulesDup = require('../validators/service-modules-dup')
const serviceModulesExist = require('../validators/service-modules-exist')
const materialsExist = require('../validators/materials-exist')
const materialExists = require('../validators/material-exists')
const foremanExists = require('../validators/foreman-exists')
const financialSubjectDup = require('../validators/financial-subject-dup')
const financialSubjectExists = require('../validators/financial-subject-exists')
const taskExists = require('../validators/task-exists')
const supplierExists = require('../validators/supplier-exists')
const galleryExists = require('../validators/gallery-exists')
const {
  makeSupplierOrder,
  supplierOrder,
  confirmSupplierOrder,
  shipSupplierOrderMaterial,
  acceptSupplierOrderMaterials,
  cancelSupplierOrder
} = require('./supplier-order')
const orderFeedbackTypeExists = require('../validators/order-feedback-type-exists')
const withPermission = require('../validators/with-permission')
const orderMaterialsExist = require('../validators/order-materials-exist')
const supplierOrderExists = require('../validators/supplier-order-exists')
const supplierOrderMaterialsExist = require('../validators/supplier-order-materials-exist')
const supplierNameNotExists = require('../validators/supplier-name-not-exists')
const supplierEmailNotExists = require('../validators/supplier-email-not-exists')
const { serviceList } = require('./service')
const { frontPageBannerList, needs } = require('./misc')
const appFeedbackTypeExists = require('../validators/app-feedback-type-exists')
const appFeedback = require('./app-feedback')
const financialStatementExists = require('../validators/financial-statement-exists')
const roleNotExists = require('../validators/role-not-exists')
const roleExists = require('../validators/role-exists')
const roleNameNotExists = require('../validators/role-name-not-exists')
const companyExists = require('../validators/company-exists')
const orderLogExists = require('../validators/order-log-exists')
const cityExists = require('../validators/city-exists')
const { constant } = require('./constant')
const gallery = require('./gallery')
const { performToTask, task } = require('./task')

const R = require('ramda')
const invokeNextChain = require('invoke-next-chain')
const nextChainIf = require('next-chain-if')
const lodash = require('lodash')
const logOrder = require('../util/log-order')
const { TASK_OPS } = require('../const')

module.exports = {
  Query: {
    getCompany,
    loginAsCompany,
    companyAccounts: guard(companyAccounts),
    companyList,
    foremanCompanyList: guard(foremanCompanyList),
    ossStsToken: guard(ossStsToken),
    ossBucketInfo: guard(ossBucketInfo),
    doesEmailExist,
    appointment: guard(appointment.appointment),
    appointmentStatusList: guard(appointment.appointmentStatusList),
    appointments: guard(
      ['in.company', 'view.appointment.assignedToMe'],
      appointment.appointments
    ),
    getOrder: guard(order.order),
    orders: guard(order.orders),
    orderFeedbackTypeList: guard(order.orderFeedbackTypeList),
    getRoomType: guard(getRoomType),
    roomTypeList: guard(roomTypeList),
    getCustomer: guard(customer.getCustomer),
    sendRegistrationEmail,
    sendChangeEmailVerificationCode,
    loginAsCustomer: customer.loginAsCustomer,
    loginAsForeman: foreman.loginAsForeman,
    getForeman: guard(foreman.getForeman),
    foremen: guard(foreman.foremen),
    supplierList: guard(supplier.supplierList),
    getMaterial: guard(getMaterial),
    materialList: guard(materialList),
    getUnitList: guard(getUnitList),
    brandList: guard(brandList),
    skuList: guard(skuList),
    getRole: guard(getRole),
    roleList: guard(roleList),
    needList: guard(needList),
    skuCategoryList: guard(skuCategoryList),
    financialSubjectList: guard(financial.financialSubjectList),
    orderStatusList: guard(order.orderStatusList),
    getSupplierOrder: supplierOrder,
    serviceList,
    frontPageBannerList,
    appFeedbackTypeList: appFeedback.appFeedbackTypeList,
    constant,
    getCompanyContact: guard(getCompanyContact),
    companyContactList: guard(companyContactList),
    gallery: guard(
      withPermission(principal => createPermission(principal, 'be.customer')
        .or(createPermission(principal, 'be.foreman'))),
      gallery.gallery
    ),
    needs,
    task: guard(
      withPermission(principal => createPermission(principal, 'be.customer')
        .or(createPermission(principal, 'be.foreman'))),
      orderExists(args => ({ id: args.orderId })),
      taskExists(args => ({
        canonicalName: args.canonicalName
      })),
      task
    ),
    principal: guard(
      roleExists((args, context) => ({
        id: args.roleId, companyId: context.auth.account.company.id
      })),
      principal
    ),
    cityList: guard(cityList),
    hello: () => 'hello at ' + new Date() + '!'
  },
  Mutation: {
    addCompany: guard(addCompany),
    editCompanyAccount: guard(
      accountExists((args, context) => ({
        id: args.id,
        companyId: context.auth.account.companyId
      })),
      editCompanyAccount
    ),
    switchCompanyAccountStatus: guard(
      accountExists((args, context) => ({
        id: args.id,
        companyId: context.auth.account.companyId
      })),
      switchCompanyAccountStatus
    ),
    createRole: guard(
      roleNotExists((args, context) => ({
        name: args.name,
        companyId: context.auth.account.company.id
      })),
      createRole
    ),
    editRole: guard(
      roleExists((args, context) => ({
        id: args.id,
        companyId: context.auth.account.company.id
      })),
      roleNameNotExists((args) => ({
        id: args.id,
        name: args.input.name || null
      })),
      editRole
    ),
    addSupplier: guard(
      supplierNameNotExists(args => args.input),
      supplierEmailNotExists(args => args.input),
      supplier.addSupplier
    ),
    bindSupplier: guard(
      supplier.validators.supplierExists,
      supplier.bindSupplier
    ),
    editSupplier: guard(
      supplierExists(R.prop('id')),
      supplierNameNotExists(args => ({
        id: args.id,
        name: args.input.name
      })),
      supplierEmailNotExists(args => ({
        id: args.id,
        email: args.input.email
      })),
      supplier.editSupplier
    ),
    updateForemanProfile: guard(
      foremanExists(R.prop('id')),
      foreman.updateForemanProfile
    ),
    foremanHandleOrder: guard(
      ['be.foreman'],
      orderExists((args, context) => ({
        id: args.id,
        foremanId: context.auth.foreman.id
      })),
      order.foremanHandleOrder
    ),
    addMaterial: guard(addMaterial),
    editMaterial: guard(
      materialExists(R.prop('id')),
      editMaterial
    ),
    removeMaterial: guard(
      materialExists(R.prop('id')),
      removeMaterial
    ),
    addAppointment: guard(appointment.addAppointment),
    editAppointment: guard(
      ['edit.appointment.assignedToMe'],
      appointmentExists(R.prop('id')),
      appointment.editAppointment
    ),
    assignAppointment: guard(
      ['assign.appointment'],
      appointmentExists(R.prop('id')),
      appointment.assignAppointment
    ),
    closeAppointment: guard(
      ['close.appointment.assignedToMe'],
      appointmentExists(R.prop('id')),
      appointment.closeAppointment
    ),
    addOrder: guard(
      nextChainIf(
        (root, { appointmentId }) => {
          return appointmentId
        },
        appointmentExists(R.prop('appointmentId'))
      ),
      salespersonExists(R.path(['input', 'salespersonId'])),
      customerExists(R.path(['input', 'customerId'])),
      order.validators.roomTypesValidator,
      order.addOrder
    ),
    updateOrderBasicInfo: guard(
      orderExists((args, context) => ({
        id: args.id,
        companyId: context.auth.account.companyId
      })),
      order.validators.roomTypesValidator,
      order.updateOrderBasicInfo
    ),
    orderSelectDesigner: guard(
      ['select_designer.order'],
      require('../validators/is-a-designer')((args, context) => ({
        id: args.designerId,
        companyId: context.auth.account.companyId
      })),
      orderExists((args, context) => ({
        id: args.id,
        companyId: context.auth.account.companyId
      })),
      order.selectDesigner
    ),
    orderSelectMaterials: guard(
      withPermission(principal => createPermission(principal, 'select_service_items.order.assignedToMe')
        .and(
          createPermission(principal, 'be.customer')
            .or(createPermission(principal, 'be.designer'))
        )),
      orderExists((args, context) => ({
        id: args.id,
        companyId: context.auth.account ? context.auth.account.companyId : null,
        cusomterId: context.auth.customer ? context.auth.customer.id : null
      })),
      modulesDup((args) => ({
        modules: args.input,
        orderId: args.id
      })),
      serviceModulesExist((args) => ({
        modules: args.input,
        orderId: args.id
      })),
      materialsExist(args => R.flatten(args.input.map(it => it.type === 'MATERIAL' ? it.selectedMaterials : []))),
      order.orderSelectMaterials
    ),
    orderSignContract: guard(
      ['sign.order.assignedToMe'],
      orderExists((args, context) => ({
        id: args.id,
        companyId: context.auth.account.companyId
      })),
      order.orderSignContract
    ),
    orderPayDownPayment: guard(
      ['be.accountant', 'pay_down_payment.order'],
      orderExists((args, context) => ({
        id: args.id,
        companyId: context.auth.account.companyId
      })),
      order.orderPayDownPayment
    ),
    orderSelectForeman: guard(
      ['select_foreman.order.assignedToMe'],
      foremanExists(R.prop('foremanId')),
      require('../validators/is-my-foreman')((args, context) => ({
        id: args.foremanId,
        companyId: context.auth.account.companyId
      })),
      orderExists((args, context) => ({
        id: args.id,
        companyId: context.auth.account.companyId
      })),
      order.orderSelectForeman
    ),
    abortOrder: guard(
      ['abort.order'],
      orderExists((args, context) => ({
        id: args.id,
        companyId: context.auth.account.companyId
      })),
      order.abortOrder
    ),
    addOrderFeedback: guard(
      ['be.customer'],
      orderExists(args => ({ id: args.orderId })),
      orderFeedbackTypeExists(args => args.type),
      order.addOrderFeedback
    ),
    registerCustomer: customer.registerCustomer,
    updateCustomerProfile: guard(
      customerExists(R.prop('id')),
      customer.updateCustomerProfile
    ),
    customerEvaluateOrder: guard(
      ['be.customer'],
      orderExists((args, context) => ({
        id: args.id,
        customerId: context.auth.customer.id
      })),
      order.customerEvaluateOrder
    ),
    registerForeman: foreman.registerForeman,
    verifyForemanEmail: foreman.verifyForemanEmail,
    bindForeman: guard(foreman.bindForeman),
    makeSupplierOrder: guard(
      ['be.designer'],
      supplierExists(R.prop('supplierId')),
      orderExists((args, context) => ({
        id: args.orderId,
        companyId: context.auth.account.companyId
      })),
      orderMaterialsExist(args => args.input.map(it => it.companyOrderMaterialId)),
      makeSupplierOrder
    ),
    confirmSupplierOrder: function (root, args, context, info) {
      return invokeNextChain(root, args, context, info)(
        supplierOrderExists((args, context) => ({
          supplierOrderId: args.supplierOrderId,
          // Todo validate supplier info when having supplier account
          supplierId: ''
        })),
        async function (...args) {
          context.body = await confirmSupplierOrder(...args)
        }
      )
        .then(() => {
          return context.body
        })
    },
    shipSupplierOrderMaterial: function (root, args, context, info) {
      return invokeNextChain(root, args, context, info)(
        supplierOrderMaterialsExist(args => ({
          supplierOrderMaterialIds: args.supplierOrderMaterialId
        })),
        async function (...args) {
          context.body = await shipSupplierOrderMaterial(...args)
        }
      )
        .then(() => {
          return context.body
        })
    },
    acceptSupplierOrderMaterials: guard(
      // ['be.foreman'],
      orderExists((args, context) => ({
        id: args.orderId,
        foremanId: context.auth.foreman.id
      })),
      supplierOrderMaterialsExist(args => ({
        supplierOrderMaterialIds: args.supplierOrderMaterialIds
      })),
      orderLogExists((args) => ({
        orderId: args.orderId,
        title: '材料验收' + args.supplierOrderMaterialIds.length + '项[' + args.supplierOrderMaterialIds + ']'
      })),
      logOrder(acceptSupplierOrderMaterials)
    ),
    cancelSupplierOrder: guard(
      ['be.designer'],
      supplierOrderExists((args, context) => ({
        supplierOrderId: args.supplierOrderId,
        companyId: context.auth.account.companyId
      })),
      cancelSupplierOrder
    ),
    addFinancialSubject: guard(
      ['be.accountant'],
      financialSubjectDup((args, context) => ({
        name: args.name,
        companyId: context.auth.account.companyId
      })),
      financial.addFinancialSubject
    ),
    editFinancialSubject: guard(
      ['be.accountant'],
      financialSubjectExists((args, context) => ({
        id: args.id,
        companyId: context.auth.account.companyId
      })),
      financialSubjectDup((args, context) => ({
        id: args.id,
        name: args.input.name,
        companyId: context.auth.account.companyId
      })),
      financial.editFinancialSubject
    ),
    removeFinancialSubject: guard(
      ['be.accountant'],
      financialSubjectExists((args, context) => ({
        id: args.id,
        companyId: context.auth.account.companyId
      })),
      financial.removeFinancialSubject
    ),
    addFinancialStatement: guard(
      ['be.accountant'],
      orderExists((args, context) => ({
        id: args.input.orderId,
        companyId: context.auth.account.companyId
      })),
      financialSubjectExists((args, context) => ({
        id: args.input.financialSubjectId,
        companyId: context.auth.account.companyId
      })),
      financial.addFinancialStatement
    ),
    editFinancialStatement: guard(
      ['be.accountant'],
      financialStatementExists(R.prop('id')),
      nextChainIf(
        (root, { input }) => {
          return lodash.isNumber(input.orderId)
        },
        orderExists((args, context) => ({
          id: args.input.orderId,
          companyId: context.auth.account.companyId
        }))
      ),
      financialSubjectExists((args, context) => ({
        id: args.input.financialSubjectId || null,
        companyId: context.auth.account.companyId
      })),
      financial.editFinancialStatement
    ),
    removeFinancialStatement: guard(
      ['be.accountant'],
      financialStatementExists(R.prop('id')),
      financial.removeFinancialStatement
    ),
    addAppFeedback: guard(
      withPermission(principal => createPermission(principal, 'be.customer')
        .or(createPermission(principal, 'be.foreman'))),
      appFeedback.validateRole,
      appFeedbackTypeExists(args => args.type),
      appFeedback.addAppFeedback
    ),
    addGallery: guard(
      ['be.foreman'],
      gallery.addGallery
    ),
    galleryAddAsset: guard(
      ['be.foreman'],
      galleryExists(R.prop('galleryId')),
      gallery.galleryAddAsset
    ),
    gallerySaveAssets: guard(
      ['be.foreman'],
      galleryExists(R.prop('galleryId')),
      gallery.gallerySaveAssets
    ),
    galleryRemoveAsset: guard(
      ['be.foreman'],
      gallery.galleryRemoveAsset
    ),
    performToTask: guard(
      orderExists(args => ({ id: args.orderId })),
      taskExists(args => ({
        canonicalName: args.canonicalName
      })),
      orderLogExists((args, context) => ({
        orderId: args.orderId,
        // 生成施工操作日志title
        title: taskExists.getTask(context).canonicalName.join('-').concat('-' + TASK_OPS[args.op].cn)
      })),
      logOrder(performToTask)
    ),
    addCompanyContact: guard(
      companyExists(R.path(['input', 'companyId'])),
      addCompanyContact
    ),
    addCity: guard(
      cityExists(args => ({
        name: args.input.name,
        citycode: args.input.citycode
      })),
      addCity
    )
  },
  JSON: GraphQLJSON,
  AppFeedbackCreator: {
    __resolveType (obj, context, info) {
      return {
        customer: 'Customer',
        foreman: 'Foreman'
      }[context[appFeedback.validateRole.roleArg]] || null
    }
  },
  ...order.resolverMap,
  ...companyResolverMap,
  Task: {
    timeElapsed: task => {
      return task.startAt && Math.round(new Date().getTime() / 1000 - task.startAt)
    }
  }
}
