const assureOwnProperty = require('./util/assure-own-property')

const ACCOUNT_STATUS = {
  Inactive: 'inactive',
  Active: 'active',
  Disabled: 'disabled'
}

const APPOINTMENT_STATUS = {
  unassigned: {
    en: 'unassigned',
    cn: '待分配'
  },
  following: {
    en: 'following',
    cn: '跟进中'
  },
  converted: {
    en: 'converted',
    cn: '已转单'
  },
  closed: {
    en: 'closed',
    cn: '已关闭'
  }
}

const APPOINTMENT_OPS = {
  assign: {
    en: 'assign',
    cn: '分配'
  },
  close: {
    en: 'close',
    cn: '关闭'
  },
  convert: {
    en: 'convert',
    cn: '转单'
  },
  edit: {
    en: 'edit',
    cn: '编辑'
  }
}

const ORDER_STATUS = {
  selecting_designer: {
    en: 'selecting_designer',
    cn: '待选设计师'
  },
  selecting_service_items: {
    en: 'selecting_service_items',
    cn: '待选材'
  },
  signing: {
    en: 'signing',
    cn: '待签约'
  },
  paying_down_payment: {
    en: 'paying_down_payment',
    cn: '待首付'
  },
  selecting_foreman: {
    en: 'selecting_foreman',
    cn: '待选云工长'
  },
  waiting_for_foreman: {
    en: 'waiting_for_foreman',
    cn: '等待云工长接单'
  },
  constructing: {
    en: 'constructing',
    cn: '施工中'
  },
  evaluating: {
    en: 'evaluating',
    cn: '待评价'
  },
  aborted: {
    en: 'aborted',
    cn: '已取消'
  },
  completed: {
    en: 'completed',
    cn: '已完成'
  }
}

const ORDER_OPS = {
  select_designer: {
    en: 'select_designer',
    cn: '选择设计师'
  },
  select_service_items: {
    en: 'select_service_items',
    cn: '选材'
  },
  sign: {
    en: 'sign',
    cn: '签约'
  },
  pay_down_payment: {
    en: 'pay_down_payment',
    cn: '支付首款'
  },
  select_foreman: {
    en: 'select_foreman',
    cn: '选择云工长'
  },
  accept: {
    en: 'accept',
    cn: '接单'
  },
  refuse: {
    en: 'refuse',
    cn: '放弃'
  },
  accomplish: {
    en: 'accomplish',
    cn: '完工'
  },
  evaluate: {
    en: 'evaluate',
    cn: '评价'
  },
  abort: {
    en: 'abort',
    cn: '取消'
  }
}
const FOREMAN_STATUS = {
  ACTIVE: 'active'
}

const SERVICE_MODULE_TYPES = {
  MATERIAL: 'MATERIAL'
}

const BALANCE_CATEGORIES = {
  INCOME: 'income',
  EXPENSE: 'expense'
}

const BUITIN_FINANCIAL_INCOME_SUBJECTS = {
  DEPOSIT: 'deposit',
  DOWN_PAYMENT: 'down_payment',
  INTERIM_PAYMENT: 'interim_payment',
  RETAINAGE_PAYMENT: 'retainage_payment'
}

const BUITIN_FINANCIAL_EXPENSE_SUBJECTS = {
  MATERIAL_COST: 'material_cost',
  SALES_COMMISSION: 'sales_commission',
  FOREMAN_COMMISSION: 'foreman_commission',
  DESIGNER_COMMISSION: 'designer_commission'
}

const TASK_TYPES = {
  PAY: '上传支付凭证',
  CONSTRUCT: '施工',
  VERIFICATION: '验收'
}

const SUPPLIER_ORDER_OPS = {
  confirm: {
    en: 'confirm',
    cn: '确认'
  },
  cancel: {
    en: 'cancel',
    cn: '取消'
  }
}

const SUPPLIER_ORDER_MATERIAL_OPS = {
  ship: {
    en: 'ship',
    cn: '发货'
  },
  accept: {
    en: 'accept',
    cn: '验收'
  }
}

const SUPPLIER_ORDER_MATERIAL_STATUS = {
  selected: {
    en: 'selected',
    cn: '已选材'
  },
  ordered: {
    en: 'ordered',
    cn: '已下单'
  },
  // 供应商已确认
  confirmed: {
    en: 'confirmed',
    cn: '已确认'
  },
  // 供应商已发货
  shipped: {
    en: 'shipped',
    cn: '已发货'
  },
  // 云工长已验收
  accepted: {
    en: 'accepted',
    cn: '已验收'
  },
  cancelled: {
    en: 'cancelled',
    cn: '已取消'
  }
}

const ORDER_MODULE_TYPES = {
  MATERIAL: 'MATERIAL',
  SERVICEFEE: 'SERVICEFEE'
}

const TASK_OPS = {
  start: {
    en: 'start',
    cn: '开始'
  },
  finish: {
    en: 'finish',
    cn: '完成'
  }
}
module.exports = assureOwnProperty({
  ACCOUNT_STATUS,
  APPOINTMENT_STATUS,
  APPOINTMENT_OPS,
  ORDER_STATUS,
  ORDER_OPS,
  FOREMAN_STATUS,
  SERVICE_MODULE_TYPES,
  TASK_TYPES,
  BALANCE_CATEGORIES,
  BUITIN_FINANCIAL_INCOME_SUBJECTS,
  BUITIN_FINANCIAL_EXPENSE_SUBJECTS,
  SUPPLIER_ORDER_OPS,
  SUPPLIER_ORDER_MATERIAL_STATUS,
  SUPPLIER_ORDER_MATERIAL_OPS,
  ORDER_MODULE_TYPES,
  TASK_OPS
})
