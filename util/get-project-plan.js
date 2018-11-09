/**
 * TODO: this is a naive implementation, it should choose the project plan
 * according to type of order and company type
 */
const getProjectPlan = async function getProjectPlan (order, context) {
  return require('../policy/variants/default/whole-decoration.js')(
    context.auth.principal
  )
}

module.exports = getProjectPlan
