require('should')
const { Principal } = require('../index')
const { createPermission } = require('../lib/permission')
const { PrincipalPermissionDenied } = require('../lib/errors')

describe('atom permission', function () {
  it('without arguments', async function () {
    let principal = new Principal()
      .addAction('edit')
      .addObject('order')
      .addObject('appointment')
      .addDecoration('in3Days')

    let edit = principal.getAction('edit')

    principal
      .setScope([
        edit.order
      ])

    let permission = createPermission(principal, edit.order)
    await permission.can().should.be.resolvedWith(true)

    permission = createPermission(principal, edit.appointment)
    await permission.can().should.be.resolvedWith(false)
    await permission.try().should.be.rejectedWith(PrincipalPermissionDenied)
  })

  it('with arguments', async function () {
    let principal = new Principal()

    principal
      .addAction('edit')
      .addObject('book')
      .addDecoration('bad')
      .addDecoration('horror')
      .addNeedHandler('edit.book.bad', function editBookBad (book) {
        return book.bad
      })
      .setScope(
        'edit.book.bad',
        'edit.book.horror'
      )

    let permission = createPermission(principal, 'edit.book.bad')

    await permission.can({ 'edit.book.bad': { bad: true } }).should.be.resolvedWith(true)
    await permission.can({ 'edit.book.bad': { bad: false } }).should.be.resolvedWith(false)

    // I have a strong need
    principal.setScope(it => it.concat('edit.book'))
    await permission.can({ bad: false }).should.be.resolvedWith(true)
  })
})

describe('and or', function () {
  let principal

  beforeEach(function () {
    principal = new Principal()
      .addAction('view')
      .addAction('edit')
      .addObject('user')
      .addObject('blog')
      .addObject('order')
      .addObject('appointment')
  })

  it('and permissions', async function () {
    let { edit } = principal.actions
    let permission = createPermission(principal,
      [edit.order, edit.appointment])
    await permission.can().should.be.resolvedWith(false)
    await permission.try().should.be.rejectedWith(PrincipalPermissionDenied)

    principal
      .setScope([edit.appointment, edit.order])

    permission = createPermission(principal, edit.appointment)
    await permission.can().should.be.resolvedWith(true)
    permission = createPermission(principal, [edit.order, edit.appointment])
    await permission.can().should.be.resolvedWith(true)

    permission = createPermission(principal, edit.order)
      .and('edit.appointment')
      .and('edit.user')
    await permission.can().should.be.resolvedWith(false)
    permission = createPermission(principal, edit.order)
      .and(['edit.appointment', 'edit.user'])
    await permission.can().should.be.resolvedWith(false)
  })

  it('or 2 permissions', async function () {
    let permission = createPermission(principal, 'view.blog')
      .or('view.user')

    principal.setScope('view.blog')
    await permission.can().should.be.resolvedWith(true)

    principal.setScope('view.user')
    await permission.can().should.be.resolvedWith(true)
    principal.setScope('edit.blog')
    permission = createPermission(principal, 'view.blog')
      .or('view.user')
    await permission.can().should.be.resolvedWith(false)
  })

  it('or 3 permissions', async function () {
    principal.setScope(['view.blog', 'view.user'])
    let permission = createPermission(principal, 'view.blog')
      .or('view.user')
      .or('edit.blog')

    await permission.can().should.be.resolvedWith(true)
  })

  it('mixed', async function () {
    principal.setScope(['view.blog', 'view.user'])
    let permission = createPermission(principal, 'view.blog')
      .and(createPermission(principal, 'view.user').or('edit.user'))

    await permission.can().should.be.resolvedWith(true)

    permission = createPermission(principal, 'view.blog')
      .and(createPermission(principal, 'view.user').or('edit.user'))
      .and('view.order')

    await permission.can().should.be.resolvedWith(false)
  })
})
