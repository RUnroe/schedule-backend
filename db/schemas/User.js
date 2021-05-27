const Long = require('long');
const Schema = require('./Schema');

module.exports = new Schema(
	'Users'
	, ['user_id', 'first_name', 'last_name', 'password', 'email'] // keys
	, ['user_id'] // requireds
	, ['first_name', 'last_name'] // nullables
	, ['user_id', 'email', 'password'] // immutables
	, ['user_id'] // automatics
	, ['user_id'] // update keys
	, { // type samples
		'user_id': new Long()
		, 'first_name': ''
		, 'last_name': ''
		, 'password': ''
		, 'email': ''
	}
	, [] // validators
	, true // permit nulls
);
