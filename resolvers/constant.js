const assureOwnProperty = require('../util/assure-own-property')
const _const = require('../const')
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

exports.constant = function (root, { path }, context, info) {
  let pivot = _const[assureOwnProperty.realObject]
  for (let k of path || []) {
    if (!pivot.hasOwnProperty(k)) {
      return {
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: `${ERROR_MESSAGES.NOT_EXIST.en} constant`,
          message_cn: `常量${ERROR_MESSAGES.NOT_EXIST.cn}`
        }
      }
    }
    pivot = pivot[k]
    console.log(pivot)
  }
  return {
    value: pivot
  }
}
