const { ver } = require('./config');
const branch = 'calendars';
const logger = require('logger').get(`api::${ver}::${branch}`);

const snowmachine = new (require('snowflake-generator'))(1420070400000);

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

const routes = [
	{
		uris: `/api/${ver}/${branch}`
		, methods: 'get'
		, handlers: calendars
	}
];

module.exports = { logger, routes };
