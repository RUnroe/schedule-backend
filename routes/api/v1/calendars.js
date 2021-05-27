const { ver } = require('./config');
const branch = 'calendars';
const logger = require('logger').get(`api::${ver}::${branch}`);

const dal = {};
const configure = (obj) => {
	Object.assign(dal, obj.dal);
};

const { requireAuth, requireNotAuth, handle } = require(require.main.path + '/routes/util');

const getCalendarEvents = (req, res) => {
	dal.getCalendarEventsByUserIds({user_id: req.session.user_id, friend_ids: req.query.id?.split(',') || []})
		.then(data => res.json(data))
		.catch(handle(req, res));
};

const getCalendarDetails = (req, res) => {
	dal.getCalendarDetails({user_id: req.session.user_id})
		.then(details => res.json(details))
		.catch(handle(req, res));
};

const editCalendarDetails = (req, res) => {
	dal.updateCalendars({user_id: req.session.user_id, calendars: req.body})
		.then(() => {
			res.status(204);
			res.statusMessage = 'Updated';
			res.end();
		})
		.catch(handle(req, res));
};

const routes = [
	{
		uris: `/api/${ver}/${branch}` // ?user_id=123,456,789
		, methods: 'get'
		, handlers: [requireAuth(), getCalendarEvents]
	}
	, {
		uris: `/api/${ver}/${branch}/details`
		, methods: 'get'
		, handlers: [requireAuth(), getCalendarDetails]
	}
	, {
		uris: `/api/${ver}/${branch}/details`
		, methods: 'put'
		, handlers: [requireAuth(), editCalendarDetails]
	}
];

module.exports = { logger, routes, configure };
