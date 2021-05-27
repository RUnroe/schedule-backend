const Schema = require('./Schema');

module.exports = new Schema(
	'Calendars'
	, ['calendar_id', 'user_id', 'name', 'url'] // keys
	, ['calendar_id'] // requireds
	, ['name'] // nullables
	, ['calendar_id', 'user_id'] // immutables
	, ['calendar_id'] // automatics
	, ['calendar_id', 'user_id'] // update keys
	, { // type samples
		'calendar_id': ''
		, 'user_id': ''
		, 'name': ''
		, 'url': ''
	}
	, [] // validators
	, true // permit nulls
);
