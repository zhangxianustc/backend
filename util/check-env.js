const REQUIRED_ENVS = [
  'DB_CONN'
]

/**
 * check required environment variables, you should include
 * this file in every stand-alone applications
 */
exports.checkEnv = function checkEnv (envs) {
  let lacking = []
  for (let i of REQUIRED_ENVS.concat(envs || [])) {
    !process.env[i] && lacking.push(i)
  }
  if (lacking.length) {
    throw new Error('require following environment variables: ' + lacking.join(', '))
  }
}
