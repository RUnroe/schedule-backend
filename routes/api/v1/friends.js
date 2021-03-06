const { ver } = require('./config');
const branch = 'friends';
const logger = require('logger').get(`api::${ver}::${branch}`);

const dal = {};
const configure = (obj) => {
	Object.assign(dal, obj.dal);
};

const { requireAuth, requireNotAuth, handle } = require(require.main.path + '/routes/util');

const search = (req, res) => {
	dal.searchFriends({user_id: req.session.user_id, user_name: req.query.q.replaceAll('+',' ')})
		.then(out => res.json(out))
		.catch(handle(req, res));
};

const list_friends = async (req, res) => {
	dal.getFriendships({user_id: req.session.user_id})
	.then(current =>
		dal.getPendingFriendships({user_id: req.session.user_id})
		.then(pending =>
			res.json({current, pending})
		)
	).catch(handle(req, res));
};

const list_current_friends = (req, res) => {
	dal.getFriendships({user_id: req.session.user_id})
	.then(friendships => res.json(friendships))
	.catch(handle(req, res));
};

const list_pending_friends = (req, res) => {
	dal.getPendingFriendships({user_id: req.session.user_id})
	.then(friendships => res.json(friendships))
	.catch(handle(req, res));
};

const add_friend = (req, res) => {
	dal.createFriendship({user_id: req.session.user_id, target_user_id: req.params.target_user_id})
		.then(friendship_id => {
			res.status(202);
			res.statusMessage = 'Friendship Pending';
			res.set('Location', `/api/${ver}/${branch}/${friendship_id}`);
			res.end();
		})
		.catch(handle(req, res))
	;
};

const delete_friend = (req, res) => {
	dal.endFriendship({user_id: req.session.user_id, friendship_or_user_id: req.params.friendship_id})
	.then(found => {
		if (found) {
			res.status(204);
			res.statusMessage = 'Friendship Ended </3';
			res.end();
		} else {
			res.sendStatus(404);
		}
	})
	.catch(handle(req, res));
};

const accept_friend = (req, res) => {
	dal.acceptFriendship({user_id: req.session.user_id, friendship_or_user_id: req.params.friendship_id})
	.then(found => {
		if (found) {
			res.status(204);
			res.statusMessage = 'Friendship Accepted :D';
			res.end();
		} else {
			res.sendStatus(404);
		}
	})
	.catch(handle(req, res));
};

const routes = [
	{
		uris: `/api/${ver}/${branch}/search`
		, methods: 'get'
		, handlers: [requireAuth(), search]
	}
	, {
		uris: `/api/${ver}/${branch}`
		, methods: 'get'
		, handlers: [requireAuth(), list_friends]
	}
	, {
		uris: `/api/${ver}/${branch}/current`
		, methods: 'get'
		, handlers: [requireAuth(), list_current_friends]
	}
	, {
		uris: `/api/${ver}/${branch}/pending`
		, methods: 'get'
		, handlers: [requireAuth(), list_pending_friends]
	}
	, {
		uris: `/api/${ver}/${branch}/:target_user_id`
		, methods: 'post'
		, handlers: [requireAuth(), add_friend]
	}
	, {
		uris: `/api/${ver}/${branch}/:friendship_id`
		, methods: 'delete'
		, handlers: [requireAuth(), delete_friend]
	}
	, {
		uris: `/api/${ver}/${branch}/:friendship_id`
		, methods: 'put'
		, handlers: [requireAuth(), accept_friend]
	}
];

module.exports = { logger, routes, configure };
