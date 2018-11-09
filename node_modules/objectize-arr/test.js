require('should')
const objectizeArr = require('./')

describe('objectize-arr', function () {
  it('simple', function () {
    let { a, b } = objectizeArr(['a', 'b'])([1, 2])
    a.should.be.exactly(1)
    b.should.be.exactly(2)
  })

  it('nested', function () {
    let { a, b } = objectizeArr(['a', ['b']])([1, [2]])
    a.should.be.exactly(1)
    b.should.be.exactly(2)
  })
})
