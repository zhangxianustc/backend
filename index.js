require('dotenv-flow').config()
require('./util/check-env').checkEnv()
const { GraphQLServer } = require('graphql-yoga')
const slow = require('./middlewares/slow')
const { importSchema } = require('graphql-import')
const resolvers = require('./resolvers')
const bodyParser = require('body-parser')
const logger = require('./logger')
const onFinished = require('on-finished')
const express = require('express')
const path = require('path')
const { ERROR_CODES } = require('./config/errors')
const R = require('ramda')
const { GraphQLError } = require('graphql/error')
const stuffAuth = require('./util/stuff-auth')

const server = new GraphQLServer({
  typeDefs: importSchema('schema/root.graphql'),
  middlewares: [slow(process.env.MOCK_SLOW || 0)],
  resolvers,
  mocks: process.env.USE_MOCK === 'true' || process.env.USE_MOCK === '1',
  context: async (it) => {
    await stuffAuth(it)
    return it
  }
})

server.express.use(require('morgan')('combined'))

server.express.use('/doc', express.static(path.join(__dirname, '/doc')))

// request logging
if (process.env.LOG_REQUEST_BODY) {
  server.express.use(bodyParser.json())
    .use((req, res, next) => {
      onFinished(res, function () {
        let { query, variables } = req.body
        logger.info('query', query)
        logger.info('variables', variables)
      })
      next()
    })
}
server.start({
  formatError (err) {
    // 为了便于理解这段处理逻辑，请先阅读
    // https://github.com/hzwellliving/backend/wiki/%E6%8E%A5%E5%8F%A3%E8%B0%83%E7%94%A8%E8%80%85%E5%BF%85%E8%AF%BB
    // 如果是graphql-yoga框架自己出现的异常，例如查询语法错误
    if (err instanceof GraphQLError && !err.originalError) {
      return err
    }
    let code = R.path(['originalError', 'code'])(err)
    // if err is user defined (which means it is throw on purpose)
    if (~Object.values(ERROR_CODES).indexOf(code)) {
      err = {
        code,
        message: err.originalError.message
      }
    } else {
      err.code = ERROR_CODES.UNKNOWN_ERROR
    }
    return err
  }
}, ({
  port
}) =>
  console.log(`Server is running on http://localhost:${port}`))
