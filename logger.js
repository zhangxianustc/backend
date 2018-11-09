const stringify = require('string.ify')
const ansicolor = require('ansicolor')
const dateFormat = require('dateformat')

const log = function log (color, ...args) {
  let s = args
    .map(it => {
      if (typeof it === 'object') {
        if (it instanceof Error) {
          return it.stack
        }
        return stringify(it)
      }
      return it
    })
    .join(' ')
  /* eslint-disable no-console */
  console.log(ansicolor[color](s))
  /* eslint-enable no-console */
}

const timestampedLog = function timestampedLog (color, ...args) {
  log(color, ...[dateFormat()].concat(args))
}

// check the colors from https://www.npmjs.com/package/ansicolor
exports.info = log.bind(this, 'magenta')
exports.debug = log.bind(this, 'cyan')
exports.warning = log.bind(this, 'yellow')
exports.error = log.bind(this, 'red')

exports.timestamped = {
  info: timestampedLog.bind(this, 'magenta'),
  debug: timestampedLog.bind(this, 'cyan'),
  warning: timestampedLog.bind(this, 'yellow'),
  error: timestampedLog.bind(this, 'red')
}
