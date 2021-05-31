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

const current = (req, res) => {
	res.json(
		{
  "18162838739488302": { "user_id": "18162393822390029", "name": "Joe Mama"  }
, "18162833478388302": { "user_id": "18162393822390030", "name": "Joe Manga" }
, "18162833434328302": { "user_id": "18162393822390031", "name": "Banjoe Ma" }
}
	);
};

const pending = (req, res) => {
	res.json(
		{
  "18162838739488302": { "user_id": "18162393822390029", "name": "Joe Mama"  }
, "18162833478388302": { "user_id": "18162393822390030", "name": "Joe Manga" }
, "18162833434328302": { "user_id": "18162393822390031", "name": "Banjoe Ma" }
}
	);
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
		.then(() => res.end())
		.catch(handle(req, res))
	;
};

const routes = [
	{
		uris: `/api/${ver}/${branch}`
		, methods: 'get'
		, handlers: [requireAuth(), friends]
	}
	, {
		uris: `/api/${ver}/${branch}/search`
		, methods: 'get'
		, handlers: [requireAuth(), search]
	}
	, {
		uris: `/api/${ver}/${branch}/current`
		, methods: 'get'
		, handlers: [requireAuth(), current]
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
];

module.exports = { logger, routes, configure };
