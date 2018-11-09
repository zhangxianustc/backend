# principal-js
fine-grained permission control system

## Installation

```
$ yarn add principal-js
```

## Test

```
$ cd <principal-js>
$ yarn install
$ yarn test
```

## How it looks like?

```javascript
import { principal, permission } from 'principal-js'

principal
  .addAction('edit')
  .addAction('create', '', 'edit')
  .addObject('blog')
  .addDecoration('in3Days')
  .setScope('create.blog')

// I can create blog, and create inherits edit, so I can edit blog
principal.can('edit.blog').should.be.true

// or you could utilize the action object
let {create} = principal.actions

permission(
  create.blog.in3Days,
  create.blog
).can().should.be.true
```

## What is a need?

A need is composed of:

  * action
  * object
  * decorations

let us look at some examples:

  * edit.blog
  * edit.blog.in3Days
  * edit.blog.in3Days.ofMyOwn

An action could inherit other action, for example **edit** inherits **view**

An need (say a) will pass another need (say b) if:
  
  * a's action is the same as or inherits b's
  * a's object is the same as b's
  * a's decortions is empty of contained by b's

Let us look at some examples:

  * **edit.blog** passes **edit.blog.in3Days**
  * **edit.blog** passes **view.blog**
  * **edit.blog** passes **view.blog.in3Days**
  * **edit.blog.in3Days** won't pass **edit.blog.ofMyOwn**
  * **edit.blog.ofMyOwn** passes **edit.blog.ofMyOwn.in3Days**
  * **edit.blog.ofMyOwn** won't pass **view.blog.in3Days**
  * **edit.blog.ofMyOwn** won't pass **edit.blog.in3Days**, vice versa

please check the test directory to get more examples.