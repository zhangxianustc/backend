# objectize-arr
convert an array to object with given keys

## INSTALLATION

```bash
$ npm i objectize-arr
```

## TEST

```nash
$ npm run test
```

## QUICKSTART

```javascript

const objectizeArr = require('objectize-arr')

objectizeArr(['a', 'b'])([1, 2]) // { a: 1, b: 2 }

objectizeArr(['a', ['b']])([1, [2]]) // { a: 1, b: 2 }

```


