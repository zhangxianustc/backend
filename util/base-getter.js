const jyi = require('jyi')
const BASE_FILE_PATH = 'policy/base.yml'

exports.get = jyi.loadFile(BASE_FILE_PATH)
