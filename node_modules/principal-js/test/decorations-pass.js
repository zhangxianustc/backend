require('should')
const decorationsPass = require('../lib/decorations-pass')

describe('decorations pass', function () {
  it('decorations pass', function () {
    decorationsPass([], [{ name: 'ofHisOwn ' }]).should.be.exactly(true)
    decorationsPass([{ name: 'ofHisOwn ' }], []).should.be.exactly(false)
    decorationsPass(
      [{ name: 'ofHisOwn' }], [{ name: 'ofHisOwn' }]
    ).should.be.exactly(true)
    decorationsPass(
      [{ name: 'ofHisOwn' }],
      [{ name: 'ofHisOwn' }, { name: 'in3Days' }]
    ).should.be.exactly(true)
    decorationsPass(
      [{ name: 'ofHisOwn' }, { name: 'in7Days' }],
      [{ name: 'ofHisOwn' }, { name: 'in3Days' }]
    ).should.be.exactly(false)
    decorationsPass(
      [{ name: 'ofHisOwn' }, { name: 'in7Days' }],
      [{ name: 'ofHisOwn' }, { name: 'bad' }, { name: 'in7Days' }]
    ).should.be.exactly(true)
  })
})
