const fs = require('fs-extra')
const yaml = require('js-yaml')
const { Principal } = require('principal-js')

const PRINCIPAL_FILE_PATH = './policy/principal.yml'
var basePrincipal

module.exports = function getBasePrinicpal () {
  if (!basePrincipal) {
    return fs.readFile(PRINCIPAL_FILE_PATH, 'utf-8')
      .then(yaml.safeLoad)
      .then(({ actions, objects, decorations = [] }) => {
        basePrincipal = decorations.reduce(
          (p, d) => p.addDecoration(...[].concat(d)),
          objects.reduce(
            (p, o) => p.addObject(...[].concat(o)),
            actions.reduce((p, a) => p.addAction(...[].concat(a)),
              new Principal())
          )
        )
        return basePrincipal
      })
  }
  return Promise.resolve(basePrincipal)
}
