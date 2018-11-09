# array-starts-with

[![MIT License](https://img.shields.io/badge/license-mit-green.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Build Status](https://travis-ci.org/oprogramador/array-starts-with.svg?branch=master)](https://travis-ci.org/oprogramador/array-starts-with
)

[![NPM status](https://nodei.co/npm/array-starts-with.png?downloads=true&stars=true)](https://npmjs.org/package/array-starts-with
)

The same as String.prototype.startsWith but comparing array elements instead of string characters

## installation
with npm:
```
npm i --save array-starts-with
```
or with yarn:
```
yarn add array-starts-with
```

## usage
```js
import arrayStartsWith from 'array-starts-with'
// or:
// const arrayStartsWith = require('array-starts-with').default;

const base = ['foo', 'bar', 'baz'];
const start = ['foo', 'bar'];

const result = arrayStartsWith(base, start);

expect(result).to.equal(true);
```
