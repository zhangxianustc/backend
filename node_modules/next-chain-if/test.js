require('should')
const invokeNextChain = require('invoke-next-chain')
const nextChainIf = require('./')

it('next-chain-if', async function () {
  var d = { a: 0 }
  await invokeNextChain(d)(
    nextChainIf(() => false, d => ++d.a)
  )
  d.a.should.be.exactly(0)
  await invokeNextChain(d)(
    nextChainIf(d => Promise.resolve(d.a % 1 === 0), async (d, next) => { ++d.a; await next() }),
    d => ++d.a
  )
  d.a.should.be.exactly(2)
})
