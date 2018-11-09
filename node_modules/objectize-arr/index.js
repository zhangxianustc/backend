const objectizeArr = function () {
  let args = Array.from(arguments)
  if (args.length === 1) {
    return function (arr) {
      return objectizeArr(args[0], arr)
    }
  }
  let keys = args[0]
  let arr = args[1]
  let ret = {}
  for (let i = 0; i < keys.length; ++i) {
    if (Array.isArray(keys[i])) {
      Object.assign(ret, objectizeArr(keys[i])(arr[i]))
    } else {
      ret[keys[i]] = arr[i]
    }
  }
  return ret
}

module.exports = objectizeArr
