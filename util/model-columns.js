const models = require('../db-models')
/**
 * get the fields of a model
 * @param {object} model a database model
 */
module.exports = function modelColumns (modelName) {
  if (!models.hasOwnProperty(modelName)) {
    throw new Error('no such model: ' + modelName)
  }
  return Object.keys(models[modelName])
    .filter(it => it)
}
