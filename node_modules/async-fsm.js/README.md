# fsm.js
a finite state machine implementation

## Quick Start

```bash
$ npm i fsm.js
```

## Test

```bash
$ npm run test
```

## Features

  * asynchronous onEnter, onLeave hooks
  * asynchronous check if operation is available
  * available operations
  * comprehensive error checking



## An example

```javascript
  const { Fsm } = require('fsm.js')
  let trafficLightFsm = new Fsm()
    .addState(function (state) {
      state
        .name('green')
        .routes({
          turn: {
            to: 'yellow'
            test () {
              principal.test(turn.trafficLight)
            } 
          },
          close: {
            to: 'closed',
            test () {
              principal.test(close.trafficLight)
            }
          }
        })
        .onEnter(() => {
          this.bundle().color = 'yellow'
        })
    })
    .addState(function (state) {
      state
        .name('yellow')
        .routes({
          turn: {
            to: 'red'
            test () {
              principal.test(turn.trafficLight)
            } 
          },
          close: {
            to: 'closed',
            test () {
              principal.test(close.trafficLight)
            }
          }
        })
        .onEnter(() => {
          this.bundle().color = 'green'
        })
    })
    .addState(function (state) {
      state
        .name('red')
        .routes({
          turn: {
            to: 'green'
            test () {
              principal.test(turn.trafficLight)
            } 
          },
          close: {
            to: 'closed',
            test () {
              principal.test(close.trafficLight)
            }
          }
        })
        .onEnter(() => {
          this.bundle().color = 'red'
        })
    })
    .addState(function (state) {
      state
        .name('closed')
        .onEnter(() => {
          this.bundle().closed = true
        })
    })

  (async function () {

    let trafficLight = { color: 'green', closed: false }

    trafficLigthFsm
      .bundle(trafficLight)
      .state(trafficLight.color)

    // assume I have all the needs
    await trafficLightFsm.ops.then(ops => ops.should.be.equal(['turn', 'close']))

    await trafficLigthFsm
      .perform('turn')
      .then(fsm => fsm.state().should.be.exactly('yellow'))

    trafficLight.color.should.be.exactly('yellow')

    await trafficLigthFsm
      .perform('turn')
      .then(fsm => fsm.state().should.be.exactly('green'))
    trafficLight.color.should.be.exactly('green')
    
    await trafficLigthFsm
      .perform('close')
      .then(fsm => fsm.terminated.should.be.exactly(true))
    trafficLight.closed.should.be.exactly(true)

  })()
  
```

please check test for more examples.