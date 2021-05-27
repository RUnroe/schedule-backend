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

const details = (req, res) => {
	res.json(
		{
			"181783920193021334": {
				"name": "get outlook for toster"
				, "url": "https://eeee.outlook.com/ur-mom.ics"
				, "enabled": true
			}
			, "181783920193021336": {
				"name": "gogle"
				, "url": "https://gmail.google.com/zoinks.ics"
				, "enabled": false
			}
			, "181783920193021337": {
				"name": "YAHOOOOOOOO"
				, "url": "https://yahoo.mx/adsadfal.ics"
				, "enabled": true
			}
			, "181783920193021338": {
				"name": "wait are you guys outside"
				, "url": "https://cody.ashby/no/sorry.ics"
				, "enabled": true
			}
		}
	);
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
		, handlers: details
	}
];

module.exports = { logger, routes, configure };
