const Long = require('long');
const Schema = require('./Schema');

module.exports = new Schema(
	'Users'
	, ['id', 'first_name', 'last_name', 'password', 'email'] // keys
	, ['id'] // requireds
	, ['first_name', 'last_name'] // nullables
	, ['id', 'email', 'password'] // immutables
	, ['id'] // automatics
	, ['id'] // update keys
	, { // type samples
		'id': new Long()
		, 'first_name': ''
		, 'last_name': ''
		, 'password': ''
		, 'email': ''
	}
	, [] // validators
	, true // permit nulls
);
