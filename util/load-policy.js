const fs = require('fs-extra')
const yaml = require('js-yaml')
const { parseNeed } = require('principal-js').utils

module.exports = async function loadPolicy (policy) {
  policy = await fs.readFile('./policy/variants/' + policy + '/base.yml', 'utf-8')
    .then(yaml.safeLoad)

  let actionSet = new Set()
  let objectSet = new Set()
  let decorationSet = new Set()
  let needList = []
  for (let need of policy.principal.needs) {
    let { action, object, decorations } = parseNeed(need)
    actionSet.add(action)
    objectSet.add(object)
    for (let d of decorations || []) {
      decorationSet.add(d)
    }
    needList.push({ action, object, decorations })
  }
  policy.principal.needs = needList
  policy.principal.actions = Array.from(actionSet)
  policy.principal.objects = Array.from(objectSet)
  policy.principal.decorations = Array.from(decorationSet)
  return policy
}
