var publicKey
const fs = require('fs-extra')
const {
  ERROR_CODES: {
    UNAUTHENTICATED,
    AUTHENTICATION_EXPIRED
  }
} = require('../config/errors')
const debug = require('debug')('wellliving:GUARD')
const jwt = require('jsonwebtoken')
const getPrincipal = require('./get-principal')

const stuffAuth = async function stuffAuth (context) {
  publicKey = publicKey || await fs.readFile('public.pem')
  if (!publicKey) {
    throw new Error('it seems that your public secret file is missing?')
  }
  let { authorization } = context.request.headers
  if (!authorization) {
    return
  }
  let m = authorization.match(/Bearer\s{0,}(\S+)/)
  let token = m && m[1]
  if (!token) {
    return
  }
  context.auth = { token }
  debug('token is: ', context.auth.token)
  try {
    Object.assign(context.auth, jwt.verify(context.auth.token, publicKey, {
      algorithms: 'RS256'
    }))
  } catch (err) {
    let newErr
    if (err instanceof jwt.TokenExpiredError) {
      newErr = new Error('token expired')
      newErr.code = AUTHENTICATION_EXPIRED
    } else {
      newErr = new Error('unauthenticated')
      newErr.code = UNAUTHENTICATED
    }
    context.auth.err = newErr
  }
  for (let accountType of ['account', 'customer', 'foreman']) {
    if (context.auth[accountType]) {
      context.auth.principal = await getPrincipal(
        accountType, context.auth[accountType]
      )
      console.log('context.auth', context.auth)
      debug('scope is: \n' + context.auth.principal.scope.map(it => '   -' + it).join('\n'))
      break
    }
  }
}

module.exports = stuffAuth
