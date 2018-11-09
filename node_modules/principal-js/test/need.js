require('should')
const { Principal } = require('../index')
const {
  PrincipalInvalidAction, PrincipalInvalidObject, PrincipalInvalidDecoration
} = require('../lib/errors')
const { parseNeed, resolve } = require('../lib/need')

describe('action need toString and label', function () {
  it('action need without decoration', function () {
    let principal = new Principal()

    principal
      .addAction('edit', '编辑')
      .addObject('order', '订单')
      .setLabelTemplate(({ action, object }) =>
        `${action}${object}`)

    let edit = principal.getAction('edit')

    let need = edit.order

    need.toString().should.equal('edit.order')
    resolve(need).label.should.equal('编辑订单')
  })

  it('action need with decoration', function () {
    let principal = new Principal()

    principal
      .addAction('edit', '编辑')
      .addObject('order', '订单')
      .addDecoration('ofHisOwn', '自己的')
      .addDecoration('in3Days', '3天内的')
      .setLabelTemplate(({ action, object, decorations }) =>
        `${action}${decorations.join(',')}${object}`)

    let edit = principal.getAction('edit')

    let need = edit.order.ofHisOwn

    need.toString().should.equal('edit.order.ofHisOwn')
    resolve(need).label.should.equal('编辑自己的订单')

    // 2 decorations
    need = need.in3Days
    need.toString().should.equal('edit.order.ofHisOwn.in3Days')
    resolve(need).label.should.equal('编辑自己的,3天内的订单')
  })

  it('throw invalid action', function () {
    let principal = new Principal()

    principal
      .addAction('edit')

    ;(() => principal.getAction('create')).should
      .throw(PrincipalInvalidAction)
  })

  it('throw invalid object', function () {
    let principal = new Principal()

    principal
      .addAction('edit')
      .addObject('order')

    let edit = principal.getAction('edit')

    ;(() => edit.appointment).should
      .throw(PrincipalInvalidObject)
  })

  it('throw invalid decoration', function () {
    let principal = new Principal()

    principal
      .addAction('edit')
      .addObject('order')
      .addDecoration('ofHisOwn')

    let edit = principal.getAction('edit')

    ;(() => edit.order.ofHerOwn).should
      .throw(PrincipalInvalidDecoration)
  })
})

describe('pass', function () {
  it('pass', function () {
    let principal = new Principal()

    principal
      .addAction('view')
      .addAction('edit', '', 'view')
      .addAction('remove', '', 'edit')
      .addObject('order')
      .addDecoration('ofHisOwn')
      .addDecoration('in3Days')

    let view = principal.getAction('view')
    let edit = principal.getAction('edit')
    let remove = principal.getAction('remove')

    let { resolve } = require('../lib/need')
    /* eslint-disable no-unused-expressions */
    resolve(view.order).pass(view.order.ofHisOwn).should.be.true
    resolve(view.order.ofHisOwn).pass(view.order).should.be.false
    resolve(view.order.ofHisOwn).pass(view.order.in3Days).should.be.false
    resolve(view.order.ofHisOwn).pass(view.order.ofHisOwn.in3Days).should.be.true
    resolve(view.order.ofHisOwn).pass(view.order.ofHisOwn.in3Days).should.be.true
    resolve(remove.order).pass(view.order).should.be.true
    resolve(edit.order).pass(view.order).should.be.true
    resolve(edit.order).pass(view.order.in3Days).should.be.true
    resolve(edit.order.in3Days).pass(view.order.in3Days).should.be.true
    resolve(edit.order.in3Days).pass(view.order).should.be.false
    resolve(edit.order.in3Days).pass(view.order.in3Days.ofHisOwn).should.be.true
    /* eslint-enable no-unused-expressions */
  })

  it('parse need', function () {
    {
      let { action, object, decorations } = parseNeed('be.player')
      action.should.equal('be')
      object.should.equal('player')
      decorations.length.should.equal(0)
    }

    {
      let { action, object, decorations } = parseNeed('be.player.good')
      action.should.equal('be')
      object.should.equal('player')
      decorations.length.should.equal(1)
      decorations[0].should.equal('good')
    }

    {
      let { action, object, decorations } = parseNeed('be.player.good.strong')
      action.should.equal('be')
      object.should.equal('player')
      decorations.length.should.equal(2)
      'good'.should.be.oneOf(decorations)
      'strong'.should.be.oneOf(decorations)
    }
  })
})
