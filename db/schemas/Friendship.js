const Long = require('long');
const Schema = require('./Schema');

module.exports = new Schema(
	'Friendships'
	, ['friendship_id', 'user_a_id', 'user_b_id', 'accepted'] // keys
	, ['friendship_id'] // requireds
	, [] // nullables
	, ['friendship_id', 'user_a_id', 'user_b_id'] // immutables
	, ['friendship_id'] // automatics
	, ['friendship_id'] // update keys
	, { // type samples
		'friendship_id': new Long()
		, 'user_a_id': new Long()
		, 'user_b_id': new Long()
		, 'accepted': false
	}
	, [ // validators
		(obj, isUpdate) => { return isUpdate && obj.accepted !== true ? ['An attempt was made to update a friendship to a status other than true/accepted, but this operation is not permitted; a pending friendship may only be either deleted or marked as accepted'] : []; }
	]
);
