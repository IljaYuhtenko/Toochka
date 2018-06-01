module.exports = {
  pg: require('pg'),
  koa: require('koa'),
  router: require('koa-router'),
  bodyParser: require('koa-bodyparser'),
  logger: require('koa-logger'),
  aws: require('aws-sdk'),
  jwt: require('jsonwebtoken'),
  uuid: require('uuid/v1'),
  cors: require('koa2-cors'),
  busboy: require('koa-busboy')
};
