require('dotenv-flow').config()
const { ERROR_CODES: { THIRD_PARTY_CALL_FAIL } } = require('../config/errors')
const OSS = require('ali-oss')
const STS = OSS.STS

exports.ossStsToken = async function ossStsToken () {
  let sts = new STS({
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET
  })

  return sts.assumeRole(process.env.OSS_STATIC_STORAGE_ARN, '', Number(process.env.OSS_STATIC_STORAGE_STS_EXPIRATION || 15) * 60, 'static_files')
    .then(token => {
      return { credentials: token.credentials }
    })
    .catch(e => {
      return {
        error: {
          code: THIRD_PARTY_CALL_FAIL,
          message: 'failed to fetch STS',
          message_cn: '获取STS失败'
        }
      }
    })
}

exports.ossBucketInfo = function ossBucketInfo () {
  return {
    bucket: process.env.OSS_STATIC_STORAGE_BUCKET,
    region: process.env.OSS_STATIC_STORAGE_REGION
  }
}
