const logger = require('logger').get('session');
// https://stackoverflow.com/a/57589215/6627273
// https://www.npmjs.com/package/connect-pg-simple

const secret = require(require.main.path + '/secrets').session.secret;

const session = require('express-session');

// for synchronous call to (maybe) create sessions table
// https://www.npmjs.com/package/pg-native#sync
const Client = require('pg-native');
const init_sql = require('fs').readFileSync(require.main.path + '/db/init-session.sql').toString();


module.exports = (pool) => {
	{
		logger.info('Initializing session table...');
		const client = new Client();
		client.connectSync();
		client.querySync(init_sql);
		logger.info('Initialized session table.');
	}

	return session({
	store: new (require('connect-pg-simple')(session))(pool)
	, secret
	, name: 'waffle.session'
	, resave: false
	, saveUninitialized: false
	, cookie: {
		maxAge: 1000*60*60*24*(process.env.SESSION_LIFETIME_DAYS || 90)
		, sameSite: true
		, secure: true
		, httpOnly: true
	}
});
}
