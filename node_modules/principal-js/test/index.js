require('should')
const { Principal, createPermission } = require('../')

describe('principal', function () {
  it('toJson and fromJson', () => {
    let principal = new Principal()
      .addAction('edit')
      .addAction('create')
      .addObject('blog')
      .addDecoration('in3Days')
      .setScope('create.blog')

    principal.can('edit.blog').should.be.resolvedWith(false)

    let { create } = principal.actions

    createPermission(principal, [
      create.blog.in3Days,
      create.blog
    ]).can().should.be.resolvedWith(true)

    let principal2 = new Principal()
      .fromJson(principal.toJson())
    principal2.can('edit.blog').should.be.resolvedWith(false)
    createPermission(principal2, 'create.blog.in3Days')
      .can().should.be.resolvedWith(true)
  })

  it('assureNeed', () => {
    let principal = new Principal()
      .addAction('edit')
      .addObject('blog')
      .addDecoration('in3Days')

    let need = principal.assureNeed('edit.blog.in3Days')
    need.toString().should.equal('edit.blog.in3Days')
    need = principal.assureNeed({
      action: 'edit',
      object: 'blog',
      decorations: ['in3Days']
    })
    need.toString().should.equal('edit.blog.in3Days')
  })

  it('hasBiggerNeedsThan', () => {
    let principal = new Principal()
      .addAction('edit')
      .addAction('create')
      .addObject('blog')
      .addDecoration('in3Days')
      .setScope('create.blog')

    principal.hasBiggerNeedsThan('edit.blog').should.be.exactly(false)
    principal.hasBiggerNeedsThan('create.blog').should.be.exactly(false)
    principal.setScope(it => it.concat('create.blog.in3Days'))
    principal.hasBiggerNeedsThan('create.blog').should.be.exactly(false)
    principal.hasBiggerNeedsThan('create.blog.in3Days').should.be.exactly(true)
    principal.hasBiggerNeedsThan('edit.blog.in3Days').should.be.exactly(false)
  })

  it('clone', () => {
    let principal1 = new Principal()
      .addAction('view')
      .addAction('edit', '', 'view')
      .addAction('create')
      .addObject('blog')
      .addDecoration('in3Days')
      .setScope('create.blog')

    let principal2 = principal1.clone()
    principal1.toJson().should.deepEqual(principal2.toJson())
  })

  it('handler', async () => {
    let principal = new Principal()
      .addAction('edit')
      .addObject('blog')
      .addDecoration('ownedByMe')
      .addNeedHandler('edit.blog.ownedByMe', async function editBlogOwnedByMe ({ blog, user }) {
        return new Promise(function (resolve) {
          setTimeout(function () {
            resolve(user.id === blog.userId)
          }, 100)
        })
      })
      .setScope('edit.blog.ownedByMe')

    await principal.can('edit.blog.ownedByMe', {
      'edit.blog.ownedByMe': { blog: { userId: 2 }, user: { id: 1 } }
    }).should.be.resolvedWith(false)
    await principal.can('edit.blog.ownedByMe', {
      'edit.blog.ownedByMe': { blog: { userId: 1 }, user: { id: 1 } }
    }).should.be.resolvedWith(true)
  })
})
