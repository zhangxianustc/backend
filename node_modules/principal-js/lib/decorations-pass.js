// can d1 pass d2 ?
function decorationsPass (d1, d2) {
  d1 = (d1 || []).sort()
  d2 = (d2 || []).sort()

  if (!d1.length) {
    return true
  }

  if (d1.length > d2.length) {
    return false
  }

  d2 = d2.map(it => it.name)

  return d1.every(({ name }) => ~d2.indexOf(name))
}

export default decorationsPass
