const { Fsm, State } = require('../')
const sinon = require('sinon')
require('should-sinon')

require('should')

describe('fsm', () => {
  it('start state', () => {
    (function () {
      new Fsm().addState('started', true)
    }).should.throw(Error)
    let fsm = new Fsm()
      .addState(state => state
        .name('started')
        .routes({
          finish: 'ended'
        }), true)
    fsm.startState.name().should.be.equal('started')
  })

  it('bundle', () => {
    let fsm = new Fsm()
      .addState('started')

    let fsmInstance = fsm.createInstance('started')
      .bundle({ foo: 'abc' })

    fsmInstance.bundle().should.have.property('foo')
    fsmInstance.bundle().foo.should.be.exactly('abc')

    fsmInstance.bundle(bundle => Object.assign({ bar: 'xyz' }))
    fsmInstance.bundle().bar.should.be.exactly('xyz')
  })

  it('relevant states', async () => {
    let instance = new Fsm()
      .addState(state => state
        .name('started')
        .routes({
          finish: 'completed'
        })
      , true)
      .addState('completed')
      .createInstance()

    let { reachable, operable } = await instance.relevantStates
    operable.length.should.be.equal(1)
    operable[0].should.be.equal('started')
    reachable.length.should.be.equal(1)
    reachable[0].should.be.equal('completed')

    instance = new Fsm()
      .addState(state => state
        .name('started')
        .routes({
          finish: {
            to: 'completed',
            test (instance) {
              return Promise.resolve(instance.bundle().foo === 'bar')
            }
          }
        })
      )
      .createInstance('started')
      .bundle({ foo: 'foo' })
    {
      let { reachable, operable } = await instance.relevantStates
      operable.length.should.be.equal(0)
      reachable.length.should.be.equal(0)
    }
  })

  it('transition', async () => {
    let fsm = new Fsm()
      .addState(function (state) {
        state
          .name('green')
          .routes({
            turnYellow: 'yellow',
            close: 'closed'
          })
      })
      .addState(new State()
        .name('yellow')
        .routes({
          turnRed: 'red',
          close: 'closed'
        })
      )
      .addState(function (state) {
        state
          .name('red')
          .routes({
            turnGree: 'green',
            close: 'closed'
          })
      })
      .addState('closed')

    let instance = fsm.createInstance('green')
    await instance.perform('turnYellow')
    instance.state.name().should.be.exactly('yellow')
    await instance.perform('turnRed')
    instance.state.name().should.be.exactly('red')
    await instance.perform('close')
    instance.state.name().should.be.exactly('closed')
  })

  it('terminated', () => {
    let instance = new Fsm()
      .addState('closed')
      .createInstance('closed')

    instance.terminated.should.be.exactly(true)
  })

  it('throw invalid op', async () => {
    let instance = new Fsm()
      .addState('closed')
      .createInstance('closed')

    await instance
      .perform('close')
      .should.be.rejectedWith(Error, { op: 'close' })

    await new Fsm()
      .addState(function (state) {
        state.name('created')
          .routes({
            close: {
              to: 'closed',
              test () {
                throw new Error('foo')
              }
            }
          })
      })
      .addState('closed')
      .createInstance('created')
      .perform('close')
      .should.be.rejectedWith(Error, { message: 'foo' })
  })

  it('throw unknown state', async () => {
    (function () {
      new Fsm()
        .createInstance('closed')
    })
      .should.throw(Error, { state: 'closed' })

    await new Fsm()
      .addState(function (state) {
        state
          .name('foo')
          .routes({
            a: 'bar'
          })
      })
      .createInstance('foo')
      .perform('a')
      .should.be.rejectedWith(Error, { state: 'bar' })
  })

  it('on enter', async () => {
    let onEnter1 = sinon.spy()
    let onEnter2 = sinon.spy()
    await new Fsm()
      .addState(function (state) {
        state
          .name('foo')
          .routes({
            a: 'bar'
          })
      })
      .addState(function (state) {
        state
          .name('bar')
          .onEnter(onEnter1)
          .onEnter(onEnter2)
      })
      .createInstance('foo')
      .perform('a', {
        baz: 'baz'
      })
    onEnter1.should.be.calledWith({
      from: 'foo',
      to: 'bar',
      args: {
        baz: 'baz'
      }
    })
    onEnter2.should.be.calledWith({
      from: 'foo',
      to: 'bar',
      args: {
        baz: 'baz'
      }
    })
  })

  it('on leave', async () => {
    let onLeave1 = sinon.spy()
    let onLeave2 = sinon.spy()
    await new Fsm()
      .addState(function (state) {
        state
          .name('foo')
          .routes({
            a: 'bar'
          })
          .onLeave(onLeave1)
          .onLeave(onLeave2)
      })
      .addState(function (state) {
        state
          .name('bar')
      })
      .createInstance('foo')
      .perform('a')
    onLeave1.should.be.calledWith({ from: 'foo', to: 'bar' })
    onLeave2.should.be.calledWith({ from: 'foo', to: 'bar' })
  })

  it('available operations', async () => {
    await new Fsm()
      .addState(function (state) {
        state.name('foo')
          .routes({
            a: 'bar'
          })
      })
      .addState('bar')
      .createInstance('foo')
      .ops
      .should.be.resolvedWith(['a'])

    await new Fsm()
      .addState(function (state) {
        state.name('foo')
          .routes({
            a: { to: 'bar', test () { return Promise.resolve(false) } },
            b: { to: 'baz', test () { return true } }
          })
      })
      .addState('bar')
      .createInstance('foo')
      .ops
      .should.be.resolvedWith(['b'])
  })
})
