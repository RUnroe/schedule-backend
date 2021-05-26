const Long = require('long');
const Schema = require('./Schema');

module.exports = new Schema(
	'Calendars'
	, ['id', 'user_id', 'name', 'url'] // keys
	, ['id'] // requireds
	, ['name'] // nullables
	, ['id', 'user_id'] // immutables
	, ['id'] // automatics
	, ['id', 'user_id'] // update keys
	, { // type samples
		'id': new Long()
		, 'user_id': new Long()
		, 'name': ''
		, 'url': ''
	}
	, [] // validators
	, true // permit nulls
);
