require('should')
const { $ } = require('../db-models')

describe('db-models', function () {
  it('table name', function () {
    $.account$.should.be.equal('account')
  })

  it('column', function () {
    $.account._.should.be.equal('account.*')
    $.account.id.should.be.equal('account.id')
  })

  it('no such table', function () {
    (function () { return $.accounts }).should.throw(Error)
  })

  it('no such column', function () {
    (function () { return $.account.ids }).should.throw(Error)
  })
})
