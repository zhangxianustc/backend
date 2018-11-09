# jyi
read data from string/file in json, yaml or ini format

## Example

```bash
const jyi = require('jyi')

// sample.json content: { "a": { "b": { "c": 1 } } }
let get = jyi.loadFile('sample.json')
get('a', 'b', 'c').then(console.log)  //  -> output 1
get('x') // throw error
```

## Install

```bash
$ npm i jyi
```
