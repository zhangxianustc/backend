require('should')
const resolveAction = require('../lib/resolve-action').default
const { Principal } = require('../index')

describe('action', function () {
  it('inherited', function () {
    let principal = new Principal()

    principal
      .addAction('view')
      .addAction('edit', '', 'view')
      .addAction('remove', '', 'edit')

    let view = principal.getAction('view')
    let edit = principal.getAction('edit')
    let remove = principal.getAction('remove')

    resolveAction(view).inherited(edit).should.be.exactly(false)
    resolveAction(edit).inherited(view).should.be.exactly(true)
    resolveAction(remove).inherited(view).should.be.exactly(true)
  })

  it('pass', function () {
    let principal = new Principal()

    principal
      .addAction('view')
      .addAction('edit', '', 'view')
      .addAction('remove', '', 'edit')

    let view = principal.getAction('view')
    let edit = principal.getAction('edit')
    let remove = principal.getAction('remove')

    resolveAction(view).pass(view).should.be.exactly(true)
    resolveAction(edit).pass(view).should.be.exactly(true)
    resolveAction(remove).pass(view).should.be.exactly(true)
  })
})
