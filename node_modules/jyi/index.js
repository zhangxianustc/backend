const fs = require('fs-extra')
const yaml = require('js-yaml')
const ini = require('ini')
const path = require('path')

function loadFile (fpath, fileType, encoding = 'utf-8') {
  var data
  let d = {
    'yaml': yaml.safeLoad,
    'yml': yaml.safeLoad,
    'json': JSON.parse,
    'ini': ini.parse
  }
  if (!fileType) {
    fileType = path.extname(fpath).slice(1).toLowerCase()
    if (!d.hasOwnProperty(fileType)) {
      throw new Error('can not guess file type of ' + fpath + ', please provide file type!')
    }
  }
  let parse = d[fileType]
  if (!parse) {
    throw new Error('fileType should be yaml(yml), json or ini')
  }

  return function jyiGet (...path) {
    path = [].concat(...path)
    return (data
      ? Promise.resolve(data)
      : fs.readFile(fpath, encoding)
        .then(parse))
      .then(data => {
        let ret = data
        for (let k of path) {
          if (!ret.hasOwnProperty(k)) {
            throw new Error(ret + ' has no such property: ' + k)
          }
          ret = ret[k]
        }
        return ret
      })
  }
}

module.exports = { loadFile }
