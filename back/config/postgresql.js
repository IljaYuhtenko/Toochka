const pg = require('./requires').pg;
const cred = require('./credentials');

const pgClient = new pg.Client({
  host: cred.host,
  port: cred.pgPort,
  database: cred.pgDB,
  user: cred.pgUser,
  password: cred.pgPass
});

pgClient.connect()
  .then(() => console.log('Pg is connected'))
  .catch(e => console.error(e.stack));

module.exports.pgClient = pgClient
