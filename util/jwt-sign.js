const fs = require('fs-extra')
const jwt = require('jsonwebtoken')

var secret

async function jwtSign (obj) {
  secret = secret || await fs.readFile('private.pem')
  if (!secret) {
    throw new Error('it seems that your private secret file is missing?')
  }
  return jwt.sign(obj, secret, {
    algorithm: 'RS256'
  })
}

module.exports = jwtSign
