const { ver } = require('./config');
const branch = 'auth';
const logger = require('logger').get(`api::${ver}::${branch}`);

const snowmachine = new (require('snowflake-generator'))(1420070400000);

// Remember!
// To authenticate is to verify an identity
// To authorize is to grant a permission

const db = {
	authenticate: async (email, password) => snowmachine.generate().snowflake
};

// Authorize the user by assigning them a session/cookie
const authorize = (req, res, next) => {
	db.authenticate(req.body.email, req.body.password).then(user_id => {
		if (user_id) {
			req.session.user_id = user_id;
			res.statusMessage = 'Authorized';
			res.status(204).end();
			return;
		}
		res.sendStatus(401);
		return;
	});
};

const routes = [
	{
		uris: `/api/${ver}/${branch}`
		, methods: ['get', 'post']
		, handlers: authorize
	}
];

module.exports = { logger, routes };
