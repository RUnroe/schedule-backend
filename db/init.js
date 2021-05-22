const logger = require('logger').get('db');

logger.info('Instantiating database connections...');
const db = new (require('pg').Pool)();
const dbSync = new (require('pg-native'))();
dbSync.connectSync();
logger.info('Instantiated database connections.');

logger.info('Initializing database relations...');
dbSync.querySync(require('fs').readFileSync(require.main.path + '/db/init.sql').toString());
const session = require('./init-session')(dbSync, db);
logger.info('Initialized database relations.');
module.exports = { db, dbSync, session, logger }
