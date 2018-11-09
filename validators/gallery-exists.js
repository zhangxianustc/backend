const db = require('../config/db')
const { $ } = require('../db-models')
const { camelize } = require('casing')
const gallerySym = Symbol('gallerySym')
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/errors')

function galleryExists (argsGetter) {
  return async function (root, args, context, info, next) {
    const id = argsGetter(args)
    let [ gallery ] = await db($.gallery$).where({ id }).then(camelize)
    if (!gallery) {
      context.body = {
        error: {
          code: ERROR_CODES.INVALID_ARGUMENTS,
          message: `${ERROR_MESSAGES.NOT_EXIST.en} gallery`,
          message_cn: `图集${ERROR_MESSAGES.NOT_EXIST.cn}`
        }
      }
      return
    }
    context[gallerySym] = gallery
    await next()
  }
}
galleryExists.getGallery = ctx => ctx[gallerySym]
module.exports = galleryExists
