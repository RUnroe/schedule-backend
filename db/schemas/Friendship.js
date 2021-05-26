const Long = require('long');
const Schema = require('./Schema');

module.exports = new Schema(
	'Friendships'
	, ['id', 'user_a_id', 'user_b_id', 'accepted'] // keys
	, ['id'] // requireds
	, [] // nullables
	, ['id', 'user_a_id', 'user_b_id'] // immutables
	, ['id'] // automatics
	, ['id'] // update keys
	, { // type samples
		'id': new Long()
		, 'user_a_id': new Long()
		, 'user_b_id': new Long()
		, 'accepted': false
	}
	, [ // validators
		(obj, isUpdate) => { return isUpdate && obj.accepted !== true ? ['An attempt was made to update a friendship to a status other than true/accepted, but this operation is not permitted; a pending friendship may only be either deleted or marked as accepted'] : []; }
	]
);
