const { Principal, createPermission } = require('./')

let principal = new Principal()
  .addAction('create')
  .addAction('edit')
  .addObject('blog')
  .addObject('user')
  .setScope('edit.user')
  .addNeedHandler('edit.user', function () {
    throw new Error('blahblah')
  })

principal.try('edit.user')
  .then(() => {})
  .catch(err => console.log(err.message))

createPermission(principal, ['edit.blog', 'edit.user']).try()
  .catch(err => console.log(err.message))

createPermission(principal, ['edit.user', 'create.user']).or('create.blog').try()
  .catch(err => console.log(err.message))
