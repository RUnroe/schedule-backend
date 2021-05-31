const logger = require('logger').get('session');
// https://stackoverflow.com/a/57589215/6627273
// https://www.npmjs.com/package/connect-pg-simple

const session = require('express-session');

module.exports = (dbSync, pool) => {
	{
		logger.info('Initializing session table...');
		dbSync.querySync(require('fs').readFileSync(require.main.path + '/db/init-session.sql').toString());
		logger.info('Initialized session table.');
	}

	return session({
		store: new (require('connect-pg-simple')(session))(pool)
		, secret: require(require.main.path + '/secrets').session.secret
		, name: 'waffle.session'
		, resave: false
		, saveUninitialized: false
		, cookie: {
			maxAge: 1000*60*60*24*(process.env.SESSION_LIFETIME_DAYS || 90)
			, sameSite: false // frickin localhost frick frick frickin fricks frick
			, secure: false // we don't require https because we live behind a reverse proxy that handles that for us, duh
			, httpOnly: true
		}
	});
}

