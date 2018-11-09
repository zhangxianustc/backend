require('should')
const oapply = require('./')

describe('oapply', function () {
  it('synchronous', async function () {
    await oapply(
      { a: 1 },
      it => ++it.a,
      it => { it.a += 2 }
    ).should.be.resolvedWith({ a: 4 })
  })

  it('asynchronous', async function () {
    await oapply(
      Promise.resolve({ a: 1 }),
      it => Promise.resolve(4).then(n => { it.a = n })
    ).should.be.resolvedWith({ a: 4 })
  })
})
