# next-chain-if
a plug in for invoke-next-chain

## quickstart

```bash
$ npm i next-chain-if
```

## test

```bash
$ cd next-chain-if
$ npm install
$ npm run test
```

## example

```javascript
let d = { a: 0 }
invokeNextChain(d)(
  nextChainIf(d => Promise.resolve(d.a % 1 === 0), async (d, next) => { ++d.a; await next() }),
  d => ++d.a
)
  .then(console.log(d)) // output { a: 2 }
```
