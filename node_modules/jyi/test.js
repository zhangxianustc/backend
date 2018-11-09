require('should')
const jyi = require('.')

describe('default', function () {
  it('loadFile ok', async function () {
    let get = jyi.loadFile('sample.yml')
    await get('a').should.be.resolvedWith('foo')
    await get('b', 'ba').should.be.resolvedWith('bar')
  })

  it('loadFile oops', async function () {
    let get = jyi.loadFile('sample.yml')
    await get('x').should.be.rejectedWith(/no such/)
  })
})
