const yaml = require('js-yaml')
const fs = require('fs-extra')

const BASE_POLICY_FILE_PATH = './policy/base.yml'

const getBasePolicy = (function () {
  let basePolicy
  return function getBasePolicy () {
    if (!basePolicy) {
      return fs.readFile(BASE_POLICY_FILE_PATH, 'utf-8')
        .then(yaml.safeLoad)
        .then(it => {
          basePolicy = it
          return it
        })
    }
    return Promise.resolve(basePolicy)
  }
})()

module.exports = { getBasePolicy }
