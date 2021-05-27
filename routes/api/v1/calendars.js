const { ver } = require('./config');
const branch = 'calendars';
const logger = require('logger').get(`api::${ver}::${branch}`);

const dal = {};
const configure = (obj) => {
	Object.assign(dal, obj.dal);
};

const { requireAuth, requireNotAuth, handle } = require(require.main.path + '/routes/util');

const calendars = (req, res) => {
	res.json(
		{
			"18162393822390028": [
				{
					"start": "2021-05-28T16:23-07:00" // can pass this directly into `new Date(...)`
					, "end"  : "2021-05-28T19:14-07:00"
				}
				, {
					"start": "2021-05-03T12:28-07:00"
					, "end"  : "2021-05-03T16:19-07:00"
				}
			],
			"18162393822390029": [
				{
					"start": "2021-05-28T16:23-07:00" // can pass this directly into `new Date(...)`
					, "end"  : "2021-05-28T19:14-07:00"
				}
				, {
					"start": "2021-05-03T12:28-07:00"
					, "end"  : "2021-05-03T16:19-07:00"
				}
			],
			"18162393822390030": [
				{
					"start": "2021-05-29T16:23-07:00" // can pass this directly into `new Date(...)`
					, "end"  : "2021-05-29T19:14-07:00"
				}
				, {
					"start": "2021-05-04T12:28-07:00"
					, "end"  : "2021-05-04T16:19-07:00"
				}
			],
			"18162393822390031": [
				{
					"start": "2021-05-26T16:23-07:00" // can pass this directly into `new Date(...)`
					, "end"  : "2021-05-26T19:14-07:00"
				}
				, {
					"start": "2021-05-02T12:28-07:00"
					, "end"  : "2021-05-02T16:19-07:00"
				}
			],
			"18162393822390032": [
				{
					"start": "2021-05-26T16:23-07:00" // can pass this directly into `new Date(...)`
					, "end"  : "2021-05-26T19:14-07:00"
				}
				, {
					"start": "2021-05-02T14:28-07:00"
					, "end"  : "2021-05-02T16:19-07:00"
				}
			]
		}
	);
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
		, handlers: calendars
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
