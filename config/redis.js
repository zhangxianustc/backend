const IORedis = require('ioredis')
let redisConfig = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  connectTimeout: 0,
  db: 0
}

module.exports = {
  redis (db = 0) {
    redisConfig.db = db
    return new IORedis(redisConfig)
  }
}
