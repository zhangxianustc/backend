const modelColumns = require('./model-columns')
/**
 * Compose query fields
 * @param [string]]
 */
module.exports = function queryFields (tableName, layers = [], alias) {
  alias = alias || tableName
  return modelColumns(tableName, layers).map(k => `${alias}.${k} as ${layers.concat(alias).join('__')}__${k}`)
}
