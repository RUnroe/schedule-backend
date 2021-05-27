const logger = require('logger').get('db');

// The thinking here is to use dbSync for startup stuff so we don't
// move on with the application until tables are created and whatnot.
// The rest of the application logic can use the async db pool.

logger.info('Instantiating database connections...');
const db = new (require('pg').Pool)();
const dbSync = new (require('pg-native'))();
dbSync.connectSync();
logger.info('Instantiated database connections.');

logger.info('Initializing database relations...');
dbSync.querySync(require('fs').readFileSync(require.main.path + '/db/init.sql').toString());
const session = require('./init-session')(dbSync, db);
logger.info('Initialized database relations.');
module.exports = { db, dbSync, session }
