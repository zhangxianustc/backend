const { DB_CONN, DB_DEBUG } = process.env

module.exports = (require('knex')({
  client: 'pg',
  connection: DB_CONN,
  debug: DB_DEBUG === '1'
}))
