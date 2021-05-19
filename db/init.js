const db = new (require('pg').Pool)();
db.query(require('fs').readFileSync(require.main.path + '/db/init.sql').toString());
const dbSync = new (require('pg-native'))();
dbSync.connectSync();
const session = require('./init-session');
module.exports = { db, dbSync, session }
