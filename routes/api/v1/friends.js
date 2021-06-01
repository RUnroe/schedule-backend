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

};

const pending = (req, res) => {
	res.json(
		{
  "18162838739488302": { "user_id": "18162393822390029", "name": "Joe Mama"  }
, "18162833478388302": { "user_id": "18162393822390030", "name": "Joe Manga" }
, "18162833434328302": { "user_id": "18162393822390031", "name": "Banjoe Ma" }
}
	);
const list_current_friends = (req, res) => {
	dal.getFriendships({user_id: req.session.user_id})
	.then(friendships => res.json(friendships))
	.catch(handle(req, res));
};

const friends = (req, res) => {
	res.json(
		{
  "current": {
    "18162838739488302": { "user_id": "18162393822390029", "name": "Joe Mama"  }
  , "18162833478388302": { "user_id": "18162393822390030", "name": "Joe Manga" }
  , "18162833434328302": { "user_id": "18162393822390031", "name": "Banjoe Ma" }
  }
, "pending": {
    "18162838739488302": { "user_id": "18162393822390029", "name": "Joe Mama"  }
  , "18162833478388302": { "user_id": "18162393822390030", "name": "Joe Manga" }
  , "18162833434328302": { "user_id": "18162393822390031", "name": "Banjoe Ma" }
  }
}
	);
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
	dal.endFriendship({user_id: req.session.user_id, friendship_id: req.params.friendship_id})
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
	dal.acceptFriendship({user_id: req.session.user_id, friendship_id: req.params.friendship_id})
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
		, handlers: [requireAuth(), pending]
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
