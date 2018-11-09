module.exports = function (test, func) {
  return async function nextChainIf () {
    let args = Array.from(arguments)
    if (await Promise.resolve(test.apply(null, args))) {
      await Promise.resolve(func.apply(null, args))
    } else {
      let next = args[args.length - 1]
      await next()
    }
  }
}
