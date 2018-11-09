const sleep = require('sleep-promise')

module.exports = function slow (ms) {
  return async function slowImpl (resolve, root, args, context, info) {
    const result = await resolve(root, args, context, info)
    await sleep(ms)
    return result
  }
}
