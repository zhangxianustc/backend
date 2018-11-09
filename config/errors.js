const assureOwnProperty = require('../util/assure-own-property')

const ERROR_CODES = {
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  INVALID_ARGUMENTS: 'INVALID_ARGUMENTS',
  THIRD_PARTY_CALL_FAIL: 'THIRD_PARTY_CALL_FAIL',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  AUTHENTICATION_EXPIRED: 'AUTHENTICATION_EXPIRED',
  NOT_FOUND: 'NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INVALID_OP: 'INVALID_OP'
}

const ERROR_MESSAGES = {
  NOT_EXIST: {
    en: 'No such',
    cn: '不存在'
  },
  WRONG: {
    en: 'wrong',
    cn: '不正确'
  },
  NOT_BELONG_TO: {
    en: 'does not belong to',
    cn: '不属于'
  },
  CAN_NOT_BE_EDITED: {
    en: 'can not be edited',
    cn: '不可编辑'
  },
  DUPLICATE: {
    en: 'duplicate',
    cn: '重复'
  },
  IS_NOT_A: {
    en: 'is not a',
    cn: '不是'
  },
  IS_REQUIRED: {
    en: 'is required',
    cn: '必须提供'
  },
  MUST_BE: {
    en: 'must be',
    cn: '必须是'
  },
  MUST_BE_PROVIDED_ONE: {
    en: 'must be provided',
    cn: '必须提供其中一个'
  },
  HAS_BEEN_REGISTERED: {
    en: 'has been registered',
    cn: '已被注册'
  },
  IS_EXPIRED: {
    en: 'is expired',
    cn: '已过期'
  },
  FAILED_TO_BIND: {
    en: 'failed to bind',
    cn: '绑定失败'
  },
  ALREADY_BOUND: {
    en: 'already bound',
    cn: '已经绑定'
  },
  FAILED_TO_UNBIND: {
    en: 'failed to unbind',
    cn: '解绑失败'
  },
  NOT_BOUND: {
    en: 'not bound',
    cn: '尚未绑定'
  },
  INVALID_EMAIL_ADDRESS: {
    en: 'invalid email address',
    cn: '邮件地址不正确'
  },
  PERMISSION_DENIED: {
    en: 'permission denied',
    cn: '权限不足'
  },
  CANNOT_PERFORM_OP: {
    en: 'cannot be performed upon task',
    cn: '不能在当前任务执行'
  },
  CANNOT_MAKE_SUPPLIER_ORDER: {
    en: 'Cannot order material from supplier yet',
    cn: '当前订单状态不可预定材料'
  }
}

module.exports = assureOwnProperty({
  ERROR_CODES,
  ERROR_MESSAGES
})
