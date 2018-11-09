function invokeNextChain (...args) {
  return async function (...funcs) {
    if (Array.isArray(funcs[0])) {
      funcs = funcs[0]
    }
    await _iter(funcs, 0, ...args)
  }
}

async function _iter (funcs, i, ...args) {
  let next = i === funcs.length - 1
    ? async () => {}
    : async function () {
      await _iter(funcs, i + 1, ...args)
    }
  await Promise.resolve(funcs[i].apply(null, [...args, next]))
}

module.exports = invokeNextChain
