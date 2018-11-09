require('should')
const invokeNextChain = require('./')

describe('invoke next chain', function () {
  it('default', async function () {
    let d = { a: 0 }
    await invokeNextChain(d)(
      (d, next) => { ++d.a; next() },
      d => ++d.a
    )
    d.a.should.be.equal(2)
    await invokeNextChain(d)(
      async (d, next) => {
        ++d.a; await next()
      },
      d => new Promise(function (resolve) {
        setTimeout(function () {
          ++d.a
          resolve()
        }, 1000)
      })
    )
    d.a.should.be.equal(4)
  })
})
