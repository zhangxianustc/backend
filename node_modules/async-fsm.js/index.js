const State = require('./lib/state')
const Fsm = require('./lib/fsm')
const errors = require('./lib/errors')

module.exports = Object.assign({ Fsm, State }, errors)
