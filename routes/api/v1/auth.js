const { ver } = require('./config');
const branch = 'auth';
const logger = require('logger').get(`api::${ver}::${branch}`);

const dal = {}, snowmachine = {};

const configure = (obj) => {
	Object.assign(dal, obj.dal);
	Object.assign(snowmachine, obj.snowmachine);
};

const { requireAuth, requireNotAuth, handle } = require(require.main.path + '/routes/util');

// Remember!
// To authenticate is to verify an identity
// To authorize is to grant a permission

const createUser = (req, res) => {
	dal.createUser(req.body)
	.then(user_id => {
		req.session.user_id = user_id.toString(); // log them in
		res.header('Location', `/api/${ver}/${branch}`);
		res.sendStatus(201);
	})
	.catch(handle(req, res));
};

// Authorize the user by assigning them a session/cookie
const authorize = (req, res, next) => {
	dal.authenticate({email: req.body.email, password: req.body.password}).then(user_id => {
		if (user_id) {
			req.session.user_id = user_id.toString();
			res.statusMessage = 'Authorized';
			res.status(204).end();
			return;
		}
		res.sendStatus(401);
		return;
	})
		.catch(handle(req, res));
};

const hasAuth = (req, res) => {
	res.end('You have a session');
}
const doesntHasAauth = (req, res) => {
	res.end('You do not haas a session')
}

const getUserInfo = (req, res) => {
	dal.getUserById({user_id: req.session.user_id}).then(user => {
		res.json(user);
	}).catch(handle(req, res));
}

const routes = [
	{
		uris: `/api/${ver}/${branch}`
		, methods: ['post']
		, handlers: authorize
	}
	, {
		uris: `/api/${ver}/${branch}`
		, methods: ['get']
		, handlers: [requireAuth(), getUserInfo]
	}
	, {
		uris: `/api/${ver}/${branch}/create`
		, methods: ['post']
		, handlers: createUser
	}
	, {
		uris: `/api/${ver}/${branch}/test`
		, methods: ['get', 'post']
		, handlers: [requireAuth(`/api/${ver}/${branch}/test/failed`), hasAuth]
	}
	, {
		uris: `/api/${ver}/${branch}/test/failed`
		, methods: ['get', 'post']
		, handlers: [requireNotAuth(`/api/${ver}/${branch}/test`), doesntHasAauth]
	}
];

module.exports = { logger, routes, configure };
