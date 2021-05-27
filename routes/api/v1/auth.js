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

// Authenticate the user by assigning them a session/cookie
const authenticate = (req, res, next) => {
	dal.authenticate({email: req.body.email, password: req.body.password})
		.then(user_id => {
			if (user_id) {
				req.session.user_id = user_id.toString();
				res.statusMessage = 'Authenticated';
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
};
const doesntHasAauth = (req, res) => {
	res.end('You do not haas a session')
};

const getUserInfo = (req, res) => {
	dal.getUserById({user_id: req.session.user_id}).then(user => {
		res.json(user);
	}).catch(handle(req, res));
};

const editUserInfo = (req, res) => {
	dal.updateUser({user_id: req.session.user_id, first_name: req.body.first_name, last_name: req.body.last_name})
	.then(() => {
		res.status(204);
		res.statusMessage = 'Updated';
		res.end();
	})
	.catch(handle(req, res));
};

const endSession = (req, res) => {
	req.session.destroy();
	res.status(204);
	res.statusMessage = 'Logged out';
	res.end();
};

const routes = [
	{
		uris: `/api/${ver}/${branch}`
		, methods: 'get'
		, handlers: [requireAuth(), getUserInfo]
	}
	, {
		uris: `/api/${ver}/${branch}`
		, methods: 'post'
		, handlers: authenticate
	}
	, {
		uris: `/api/${ver}/${branch}`
		, methods: 'put'
		, handlers: [requireAuth(), editUserInfo]
	}
	, {
		uris: `/api/${ver}/${branch}`
		, methods: 'delete'
		, handlers: [requireAuth(), endSession]
	}
	, {
		uris: `/api/${ver}/${branch}/create`
		, methods: 'post'
		, handlers: createUser
	}
];

module.exports = { logger, routes, configure };
