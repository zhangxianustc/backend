require('should')
const assureOwnProperty = require('../util/assure-own-property')

describe('asure own property', function () {
  it('default', async () => {
    let o = assureOwnProperty({
      foo: 'abc',
      bar: {
        baz: 'xyz'
      }
    })

    o.foo.should.be.equal('abc')
    o.bar.baz.should.be.equal('xyz')

    ;(function () {
      console.log(o.baz)
    }).should.throw(Error)

    ;(function () {
      console.log(o.bar.bar)
    }).should.throw(Error)
  })
})
