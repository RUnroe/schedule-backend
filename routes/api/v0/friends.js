const { ver } = require('./config');
const branch = 'friends';
const logger = require('logger').get(`api::${ver}::${branch}`);

const snowmachine = new (require('snowflake-generator'))(1420070400000);

const search = (req, res) => {
	res.json([
		  { "user_id": "18162393822390029", "name": "Joe Mama" , "icon": "18162838739488302", "pending": false }
		, { "user_id": "18162393822390030", "name": "Joe Manga", "icon": "18162833478388302", "pending": false }
		, { "user_id": "18162393822390031", "name": "Banjoe Ma", "icon": "18162833434328302", "pending": true }
		, { "user_id": "18162393822390032", "name": "fu Ma", "icon": "18162833434328302", "pending": false }
	]);
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

const routes = [
	{
		uris: `/api/${ver}/${branch}`
		, methods: 'get'
		, handlers: friends
	}
	, {
		uris: `/api/${ver}/${branch}/search`
		, methods: 'get'
		, handlers: search
	}
	, {
		uris: `/api/${ver}/${branch}/current`
		, methods: 'get'
		, handlers: current
	}
	, {
		uris: `/api/${ver}/${branch}/pending`
		, methods: 'get'
		, handlers: pending
	}
];

module.exports = { logger, routes };
