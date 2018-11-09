# oapply
apply a (asynchronous) function to an object and return this object, similar to kotlin's apply

## quickstart

```bash
$ npm i oapply
```

## test

```bash
$ npm run test
```


## example

```javascript
oapply(
  Promise.resolve({ a: 1 }),
  it => ++it.a,
  it => { it.a += 2 }
).then(it => console.log(it.a)) // output 4
```
