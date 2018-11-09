const db = require('../config/db')
const { $ } = require('../db-models')
const { camelize, snakeize } = require('casing')
const layerify = require('layerify')
const qf = require('../util/query-fields')

exports.addGallery = async function (root, { description }, context) {
  let [gallery] = await db($.gallery$)
    .insert(snakeize({
      description,
      creator_id: context.auth.foreman.id
    }))
    .returning('*')
    .then(camelize)

  gallery.creator = await db($.foreman$)
    .where({ id: gallery.creatorId })
    .then(it => camelize(it[0]))
  return { gallery }
}

exports.gallery = async function (root, { id }) {
  let [gallery] = await db($.gallery$)
    .join($.foreman$ + ' as creator', 'creator.id', $.gallery.creator_id)
    .where($.gallery.id, id)
    .select(
      $.gallery._,
      ...qf($.foreman$, [], 'creator')
    )
  if (gallery) {
    gallery = camelize(layerify(gallery))
    gallery.assets = await db($.asset$)
      .where('gallery_id', gallery.id)
      .then(camelize)
  }
  return { gallery }
}

exports.galleryAddAsset = async function (root, args) {
  return db($.asset$)
    .insert(snakeize(args))
    .returning('*')
    .then(it => ({
      asset: camelize(it[0])
    }))
}

exports.gallerySaveAssets = async function (root, { galleryId, input }) {
  return db.transaction(async function (trx) {
    // 清空原有的assets
    await db($.asset$)
      .where($.asset.gallery_id, galleryId)
      .del()
    input.map(it => { it.galleryId = galleryId })
    let assets = await db($.asset$)
      .insert(snakeize(input))
      .returning('*')
      .then(camelize)

    return { assets }
  })
}

exports.galleryRemoveAsset = async function (root, { id }) {
  return {
    count: await db($.asset$)
      .where({ id })
      .del()
  }
}
