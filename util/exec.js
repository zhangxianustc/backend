const dashify = require('dashify')
const { spawnSync } = require('child_process')
const R = require('ramda')
const logger = require('../logger')

function argumentsFrom (o) {
  return R.flatten(Object.entries(o).map(
    ([k, v]) => [].concat(v).map(_v => ['--' + dashify(k), _v])))
}

function exec (file, kwArgs, args = []) {
  args = kwArgs ? argumentsFrom(kwArgs).concat(args) : []
  logger.info(['exec: ' + file, ...args.map(it => '    ' + it)].join(' \\ \n'))

  let { status } = spawnSync(file, args, { stdio: 'inherit' })
  if (status !== 0) {
    process.exit(1)
  }
}

module.exports = exec
