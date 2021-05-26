const logger = require('logger').get('dal');

let db, snowmachine;
const configure = (obj) => {
	db = obj['db'];
	snowmachine = obj['snowmachine'];
};

const Long = require('long');

const hasher = require('argon2');
const hash_options = {
	type: hasher.argon2id
};

// takes data from database and converts anything necessary before shipping data to users
// e.g. convert snowflakes from Long to string
const convertTypesForDistribution = (row) => {
	const out = {};
	for (let key of Object.keys(row))
		if (row[key] !== undefined && row[key] !== null)
			switch (row[key].constructor.name) {
				case 'Long': out[key] = row[key].toString(); break;
				default: out[key] = row[key];
			}
	else out[key] = row[key];
	return out;
};

// TODO implement password validation
			//(record, isUpdate) => {return ((isUpdate && record.name === undefined) || (/^[a-z0-9-]{1,64}$/.test(record.name) && /^[a-z0-9]/.test(record.name) && /[a-z0-9]$/.test(record.name) && !(/--/.test(record.name))))? [] : [`Channel name must be composed only of lowercase a-z and hyphens, with no more than one consecutive hyphen, starting and ending with a letter, but ${record.name} was supplied`]}
// oh no, what have i done
// name, keys, requireds, nullables, immutables, automatics, update keys, type samples, validators, permit nulls
const schemas = {
	User: require('./schemas/User')
	, Calendar: require('./schemas/Calendar')
	, Friendship: require('./schemas/Friendship')
};

// adds things like 'guild_id < ?' to the list of constraints supplied
// also adds errors if appropriate
const addSnowflakeConstraint = (key, constraint_string, options, constraints, params, errors, required = false) => {
	if (options[key] === undefined) {
		if (required)
			errors.push(`'${key}' must be a snowflake (either as a string or a Long), but ${options[key]} was supplied`);
		return;
	}
	if (options[key] === null) {
		errors.push(`'${key}' must be a snowflake (either as a string or a Long), but ${options[key]} was supplied`);
		return;
	}
	constraints.push(`${constraint_string} ?`);
	switch (options[key].constructor.name) {
		case 'String':
		case 'Long':
			params.push(coerceToLong(options[key], errors));
			break;
		default:
			errors.push(`'${key}' must be a snowflake (either as a string or a Long), but ${options[key]} of type ${options[key].constructor.name} was supplied`);
	}
};

const generateResultLimit = (limit, params, errors, required = false) => {
	if (limit === undefined) {
		if (required)
			errors.push(`'limit' search filter must be supplied, but was not`);
		return '';
	}
	if (limit === null) {
		errors.push(`'limit' search filter must be a Number, but ${limit} was supplied`);
		return '';
	}
	if (limit.constructor.name !== 'Number')
		errors.push(`'limit' search filter must be a Number, but ${limit} of type ${limit.constructor.name} was supplied`);
	else if (limit < 1)
		errors.push(`'limit' search filter must be a positive integer, but ${limit} was supplied`);
	else {
		params.push(limit);
		return ' LIMIT ?';
	}
};

const coerceToLong = (x, errors = []) => { // error list may be omitted; if it doesn't look like a snowflake then we return null
	if (x === undefined || x === null) {
		errors.push(`A value representing a snowflake was expected, but ${x} was supplied`);
		return null;
	}
	if (x.constructor.name === 'Long') return x;
	if (x.constructor.name === 'String') {
		const out = Long.fromString(x);
		if (out == 0) {
			errors.push(`The string '${x}' does not appear to represent a snowflake, but a snowflake was required`);
			return null;
		}
		return out;
	}
	if (x.constructor.name === 'Number') {
		errors.push(`Most snowflakes used in this application are too large to store as 64-bit floats; therefore, to prevent data errors, the numeric value ${x} was rejected during snowflake parsing. Please pass in a string or Long representing the snowflake`);
	}
	return null;
};

/*
 ** guidelines for designing these methods
 ** 
 **  - all crud operations are async and may throw an array of strings that describe errors
 **   - as many errors as possible/helpful should be thrown at once
 **   - all methods should start with a type-checking block
 **  - all snowflakes should be acceptable as either strings or Longs
 **  - all snowflakes should be returned as strings
 **  - optional keys or parameters that are undefined should be ignored
 **  - optional keys or parameters with otherwise illegal values (including null) should throw errors
 **  - required keys or parameters with illegal values (including undefined and null) should throw errors
 **
 **  - create takes only mandatory parameters, no options object
 **   - returns the created record
 **  - read takes mandatory parameters and an options object
 **   - returns an array of records
 **  - update takes mandatory parameters and an options object
 **   - returns undefined
 **  - delete takes only mandatory parameters, no options object
 **   - returns undefined
 **
 */

/*************************************************************************
 * guilds
 */
/*
// returns description of guild, or throws
const createGuild = async (name, icon_snowflake) => {
	const errors = [];
	if (name === undefined || name === null)
		errors.push(`A name must be passed, but ${name} was supplied`);
	if (icon_snowflake === undefined || icon_snowflake === null)
		errors.push(`An icon snowflake must be passed, but ${icon_snowflake} was supplied`);
	else icon_snowflake = coerceToLong(icon_snowflake, errors);
	if (errors.length) {
		throw errors;
	}

	const record = {
		guild_id: coerceToLong(snowmachine.generate().snowflake)
		, name
		, icon_id: icon_snowflake
	};

	return db.execute(...schemas.guilds.getInsertStmt(record))
		.then(() => convertTypesForDistribution(record))
	;
};

// returns list of guild descriptions, or throws
const getGuilds = async (options = {
	guild_id: undefined
	, limit: undefined
}) => {
	const keys = Object.keys(options);
	const constraints = [];
	let limit = '';
	const params = [];
	const errors = [];

	// catch passing other junk as the options
	if (options === null || options.constructor.name !== 'Object') 
		errors.push(`An optional object containing filtering keys was expected, but ${options} was supplied`);

	addSnowflakeConstraint('guild_id', 'guild_id =', options, constraints, params, errors);
	limit = generateResultLimit(options.limit, params, errors);

	if (errors.length) {
		throw errors;
	}

	let opt_string = '';
	if (constraints.length) opt_string = 'WHERE ';
	opt_string += constraints.join(' AND ');
	opt_string += limit;

	return db.execute(...schemas.guilds.getSelectStmt(opt_string, params))
		.then(res => res.rows)
		.then(rows => rows.map(convertTypesForDistribution))
	;
};

// returns or throws
// FIXME this is currently an expensive operation, with three queries total
// try to reduce this, eh?
// ok, it's just two now---got rid of the last fetch; returns undefined on success
const updateGuild = async (guild_snowflake, changes) => {
	const errors = [];

	if (guild_snowflake === undefined || guild_snowflake === null)
		errors.push(`A guild snowflake must be passed, but ${guild_snowflake} was supplied`);
	else guild_snowflake = coerceToLong(guild_snowflake, errors);
	if (changes === undefined || changes === null || changes.constructor.name !== 'Object' || Object.keys(changes).length < 1)
		errors.push(`An object describing changes to be made must be passed, but ${changes} was supplied`);
	if (changes && changes.icon_id !== undefined)
		changes.icon_id = coerceToLong(changes.icon_id, errors);

	if (errors.length) {
		throw errors;
	}

	return getGuilds({guild_id: guild_snowflake})
		.then(rows => rows.length > 0)
		.then(recordExists => {
			if (recordExists)
				return db.execute(...schemas.guilds.getUpdateStmt(Object.assign({}, {guild_id: guild_snowflake}, changes)))
					.then(() => {})
			;
			else
				throw [`Only existing guilds may be updated, but no guild with id ${guild_snowflake} was found`];
		});
};

// returns or throws
const deleteGuild = async (guild_snowflake) => {
	const errors = [];
	if (guild_snowflake === undefined || guild_snowflake === null)
		errors.push(`A guild snowflake must be passed, but ${guild_snowflake} was supplied`);
	else guild_snowflake = coerceToLong(guild_snowflake, errors);
	if (errors.length) {
		throw errors;
	}

	return db.execute(...schemas.guilds.getDeleteStmt({
		guild_id: guild_snowflake
	})).then(() => {});
};
*/

/*************************************************************************
 * channels_by_guild
 */
/*
// returns description of channel, or throws
const createChannel = async (guild_snowflake, name, position = -1) => {
	const errors = [];
	if (guild_snowflake === undefined || guild_snowflake === null)
		errors.push(`A guild snowflake must be passed, but ${guild_snowflake} was supplied`);
	else guild_snowflake = coerceToLong(guild_snowflake, errors);
	if (name === undefined || name === null)
		errors.push(`A name must be passed, but ${name} was supplied`);
	if (position === null || position.constructor.name !== 'Number')
		errors.push(`An optional position may be passed, but ${position} was supplied`);
	if (errors.length) {
		throw errors;
	}

	if (!(position > 0)) { // this handles strings and bad guys lmao end me // this shouldn't matter; catch type errors above
		// by default, append the channel to the end of the guild
		position = await getChannels(guild_snowflake).then(rows => rows.length);
		//console.log('using position ' + position);
	} else position = position - 0; // coerce number type

	const record = {
		guild_id: guild_snowflake
		, channel_id: coerceToLong(snowmachine.generate().snowflake)
		, name
		, position
	};

	return db.execute(...schemas.channels_by_guild.getInsertStmt(record))
		.then(() => convertTypesForDistribution(record));
};

const addChannelToGuild = async (guild_snowflake, channel_snowflake, name, position = -1) => {
	const errors = [];
	if (guild_snowflake === undefined || guild_snowflake === null)
		errors.push(`A guild snowflake must be passed, but ${guild_snowflake} was supplied`);
	else guild_snowflake = coerceToLong(guild_snowflake, errors);
	if (channel_snowflake === undefined || channel_snowflake === null)
		errors.push(`A channel snowflake must be passed, but ${channel_snowflake} was supplied`);
	else channel_snowflake = coerceToLong(channel_snowflake, errors);
	if (name === undefined || name === null)
		errors.push(`A name must be passed, but ${name} was supplied`);
	if (position === null || position.constructor.name !== 'Number')
		errors.push(`An optional position may be passed, but ${position} was supplied`);
	if (errors.length) {
		throw errors;
	}

	if (!(position > 0)) { // this handles strings and bad guys lmao end me // this shouldn't matter; catch type errors above
		// by default, append the channel to the end of the guild
		position = await getChannels(guild_snowflake).then(rows => rows.length);
		//console.log('using position ' + position);
	} else position = position - 0; // coerce number type

	const record = {
		guild_id: guild_snowflake
		, channel_id: channel_snowflake
		, name
		, position
	};

	return db.execute(...schemas.channels_by_guild.getInsertStmt(record))
		.then(() => convertTypesForDistribution(record));
};

// TODO consider removing before and after; they're kinda useless, innit?
// returns list of channel descriptions, or throws
const getChannels = async (guild_snowflake, options = {
	before: undefined
	, after: undefined
	, channel_id: undefined
	, limit: undefined
}) => {
	const keys = Object.keys(options);
	const constraints = [];
	let limit = '';
	const params = [];
	const errors = [];

	// catch passing other junk as the options
	if (options === null || options.constructor.name !== 'Object') 
		errors.push(`An optional object containing filtering keys was expected, but ${options} was supplied`);

	// mandatory; this is the partition key
	addSnowflakeConstraint('guild_snowflake', 'guild_id =', {guild_snowflake}, constraints, params, errors, true); // true: this is required and will fail if not provided

	// optional constraints
	addSnowflakeConstraint('before'    , 'channel_id <', options, constraints, params, errors);
	addSnowflakeConstraint('after'     , 'channel_id >', options, constraints, params, errors);
	addSnowflakeConstraint('channel_id', 'channel_id =', options, constraints, params, errors);
	limit = generateResultLimit(options.limit, params, errors);

	if (errors.length) {
		throw errors;
	}

	let opt_string = '';
	if (constraints.length) opt_string = 'WHERE ';
	opt_string += constraints.join(' AND ');
	opt_string += limit;

	return db.execute(...schemas.channels_by_guild.getSelectStmt(opt_string, params))
		.then(res => res.rows)
		.then(rows => rows.map(convertTypesForDistribution))
	;
};

// returns or throws
const updateChannel = async (guild_snowflake, channel_snowflake, changes) => {
	const errors = [];

	if (guild_snowflake === undefined || guild_snowflake === null)
		errors.push(`A guild snowflake must be passed, but ${guild_snowflake} was supplied`);
	else guild_snowflake = coerceToLong(guild_snowflake, errors);
	if (channel_snowflake === undefined || channel_snowflake === null)
		errors.push(`A channel snowflake must be passed, but ${channel_snowflake} was supplied`);
	else channel_snowflake = coerceToLong(channel_snowflake, errors);
	if (changes === undefined || changes === null || changes.constructor.name !== 'Object' || Object.keys(changes).length < 1)
		errors.push(`An object describing changes to be made must be passed, but ${changes} was supplied`);
	if (errors.length) {
		throw errors;
	}

	return getChannels(guild_snowflake, {channel_id: channel_snowflake})
		.then(rows => rows.length > 0)
		.then(recordExists => {
			if (recordExists)
				return db.execute(...schemas.channels_by_guild.getUpdateStmt(Object.assign({}, {guild_id: guild_snowflake, channel_id: channel_snowflake}, changes)))
					.then(() => {})
			;
			else
				throw [`Only existing channels may be updated, but no channel with id ${channel_snowflake} was found in guild ${guild_snowflake}`];
		});
};

// returns or throws
const deleteChannel = async (guild_snowflake, channel_snowflake) => {
	const errors = [];
	if (guild_snowflake === undefined || guild_snowflake === null)
		errors.push(`A guild snowflake must be passed, but ${guild_snowflake} was supplied`);
	else guild_snowflake = coerceToLong(guild_snowflake, errors);
	if (channel_snowflake === undefined || channel_snowflake === null)
		errors.push(`A channel snowflake must be passed, but ${channel_snowflake} was supplied`);
	else channel_snowflake = coerceToLong(channel_snowflake, errors);
	if (errors.length) {
		throw errors;
	}

	return db.execute(...schemas.channels_by_guild.getDeleteStmt({
		guild_id: guild_snowflake
		, channel_id: channel_snowflake
	})).then(() => {});
};

const clearChannels = async (guild_snowflake) => {
	const errors = [];
	if (guild_snowflake === undefined || guild_snowflake === null)
		errors.push(`A guild snowflake must be passed, but ${guild_snowflake} was supplied`);
	else guild_snowflake = coerceToLong(guild_snowflake, errors);
	if (errors.length) {
		throw errors;
	}

	return db.execute('DELETE FROM channels_by_guild WHERE guild_id = ?', [guild_snowflake], { prepare: true }).then(() => {});
};
*/


/*************************************************************************
 * messages_by_channel
 */
/*
// returns description of message, or throws
const createMessage = async (channel_snowflake, author_snowflake, body) => {
	const errors = [];
	if (channel_snowflake === undefined || channel_snowflake === null)
		errors.push(`A channel snowflake must be passed, but ${channel_snowflake} was supplied`);
	else channel_snowflake = coerceToLong(channel_snowflake, errors);
	if (author_snowflake === undefined || author_snowflake === null)
		errors.push(`A user snowflake must be passed, but ${author_snowflake} was supplied`);
	else author_snowflake = coerceToLong(author_snowflake, errors);
	if (body === undefined || body === null)
		errors.push(`A body must be passed, but ${body} was supplied`);
	if (errors.length) {
		throw errors;
	}

	const message_id = coerceToLong(snowmachine.generate().snowflake);

	const record = {
		channel_id: channel_snowflake
		, bucket: getBucket(message_id)
		, author_id: author_snowflake
		, message_id
		, body
	};

	return db.execute(...schemas.messages_by_channel_bucket.getInsertStmt(record))
		.then(() => convertTypesForDistribution(record));
};

// returns list of message descriptions, or throws
// do not depend on the output to be sorted in any manner
// FIXME ok so if you have two buckets and all of the messages are in range and you request just enough to get one and a half buckets,
// how do you ensure that you get the right half of the second bucket
// FIXME FIXME FIXME ohno ^
// you might need to grab the whole bucket and filter over here
// FIXME unrelated, if they give us a message_id, just search the bucket it belongs in! brilliant!
// i wonder if i ever fixed that
const getMessages = async (channel_snowflake, options = {
	before: undefined
	, after: undefined
	, message_id: undefined
	, limit: undefined
}) => {
	const keys = Object.keys(options);
	// these are the partition keys; we'll need them for sure. put the bucket in a predictable location (0) so we can swap it out later
	const constraints = ['bucket = ?', 'channel_id = ?'];
	const params = [null, channel_snowflake];
	const errors = [];

	// validate types of surface-level parameters
	if (channel_snowflake === undefined || channel_snowflake === null)
		errors.push(`A channel snowflake must be passed, but ${channel_snowflake} was supplied`);
	else channel_snowflake = coerceToLong(channel_snowflake, errors);
	if (options === null || options.constructor.name !== 'Object')
		errors.push(`An object containing filtering keys was expected, but ${options} was supplied`);
	if (errors.length) {
		throw errors;
	}
	// we now certainly have a channel_snowflake and an options object
	// next let's ensure that all options are either undefined or of a correct type
	// ok. so. before and after are good names for parameters, but very hard to use throughout the method.
	// so we're gonna rename them to "latest" and "earliest"
	let earliest, latest;
	if (options.before !== undefined)
		latest = coerceToLong(options.before, errors);
	if (options.after !== undefined)
		earliest = coerceToLong(options.after, errors);
	if (options.message_id !== undefined)
		options.message_id = coerceToLong(options.message_id, errors);
	if (options.limit !== undefined) {
		if (options.limit === null) {
			errors.push(`'limit' search parameter is expected to be a Number, but ${options.limit} was supplied`);
		} else if (options.limit.constructor.name !== 'Number') {
			errors.push(`'limit' search parameter is expected to be a Number, but ${options.limit} of type ${options.limit.constructor.name} was supplied`);
		}
	}
	if (errors.length) {
		throw errors;
	}
	// we now certainly know:
	// - channel_snowflake is a Long
	// - options is an object
	// - earliest is either a Long or undefined
	// - latest is either a Long or undefined
	// - options.message_id is either a Long or undefined
	// - options.limit is either a number or undefined
	// next let's verify that we have at least one of message_id and limit
	if (options.message_id !== undefined) {
		options.limit = 1;
		constraints.push('message_id = ?'); // TODO test this
		params.push(options.message_id);
	} else if (options.limit === undefined) {
		errors.push(`One of 'message_id' or 'limit' must be specified in the search options object, but neither was supplied`);
	}
	if (errors.length) {
		throw errors;
	}
	// we now certainly know:
	// - all of the above items
	// - we have a limit
	// - if we're looking for a specific message, we've got that constraint listed
	// next let's determine which direction to search:
	// - if there's a before, then we search backward
	// - otherwise, if there's an after, then we search forward
	// - otherwise, we search backward
	// we'll add this value to our bucket to move through time: +1 means a later bucket (forward); -1 means an earlier bucket (backward)
	//          earliest   is less than   latest
	// earlier <---|-------------------------|---> later
	//     backward                           forward
	//        -1                                 +1
	// i sure hope this helps me or i'm gonna look real dumb
	let search_direction = -1; // backward is the default
	if (options.before === undefined && options.after !== undefined) { // but if this is the case, we go forward instead
		search_direction = 1; // credit to Ryan Unroe
	}
	// we now certainly know:
	// - all of the above items
	// - which way we're traveling through time
	// next let's ensure that our start and end times are both defined and reasonable
	const now = coerceToLong(snowmachine.generate().snowflake);
	const dawn = channel_snowflake;
	if (!latest || latest.greaterThan(now))
		latest = now;
	if (!earliest || earliest.lessThan(dawn))
		earliest = dawn;
	if (earliest.greaterThan(latest))
		errors.push(`The earliest acceptable timestamp (${earliest}) occurs after the latest acceptable timestamp (${latest}), which is an impossible scenario`);
	if (errors.length) {
		throw errors;
	}
	//console.log('Dawn:\t\t\t', dawn.toString(), getBucket(dawn));
	//console.log('Earliest (after):\t', earliest.toString(), getBucket(earliest));
	//console.log('Latest (before):\t', latest.toString(), getBucket(latest));
	//console.log('Now:\t\t\t', now.toString(), getBucket(now));
	// we now certainly know:
	// - all of the above items
	// - our before and after times are defined and reasonable
	// next let's add them to our list of constraints
	//
	// WEATHER UPDATE
	// We're not doing this on the database anymore, because of Big Hole
	// instead we're gonna get full buckets and filter server-side
	//constraints.push('message_id <= ?');
	//params.push(latest);
	//constraints.push('message_id >= ?');
	//params.push(earliest);
	//
	// we now certainly know:
	// - all of the above items
	// - we will only receive messages from within the time boundaries
	// next let's determine our earliest, latest, and starting buckets
	const earliest_bucket = getBucket(earliest, errors);
	const latest_bucket = getBucket(latest, errors);
	const starting_bucket = search_direction === 1 ? earliest_bucket : latest_bucket;
	// this was the last opportunity for pre-database errors to be pushed, so let's flush them out one last time
	if (errors.length) {
		throw errors;
	}
	// we now certainly know:
	// - all of the above items
	// - the bucket we're starting in
	// - the buckets to stay between (inclusive)
	// next let's define our query string
	const query = 'SELECT * FROM messages_by_channel_bucket WHERE ' + constraints.join(' AND ');// + ' LIMIT ?;';
	// we still haven't pushed the limit, so let's do that now
	// params.push(options.limit);
	// Q: this is a limit on how many messages we want total, right? not how many we want per bucket? so why include it?
	// A: that's a great question! while we may have to scan more than one bucket, we still won't ever want more than n messages
	//    from a single bucket, so it's okay to include this. it helps in the case that we find all of our messages in one bucket,
	//    and it doesn't hurt very much if we have to scan multiple buckets anyways. that's assuming Cassandra works the way I imagine
	//    it does, which it may not. I'm hoping that it just stops scanning when we reach the limit of the query. I also hope, but less so,
	//    that it ignores the limit if it's greater than the number of rows in a table.
	// Q: hang on a sec. if you find some messages in one bucket, then go on to the next bucket, wouldn't it make sense to reduce the query
	//    limit from then on?
	// A: ...yes it would! let's do that!
	// take note, ye intrepid reader! the limit shall henceforth be specially-located at the _end_ of the params array, so we can push and pop it
	// when we want to change it. we'll do this whenever we get some messages back.
	// WEATHER UPDATE
	// Due to Big Hole, this plan is cancelled. We'll be fetching entire buckets and filtering server-side.

	// keep in mind that the bucket and channel_id were in the params and constraints arrays to start with.
	// we'll overwrite the bucket (at index 0) each loop, and we'll overwrite the result limit (at last index) whenever we find messages
	// we now certainly know:
	// - all of the above items
	// - the query we intend to execute
	// - the parameters to pass in
	// next we'll execute queries until we have enough messages to satisfy the limit, or until we run out of buckets, whichever comes first
	const messages = []; // here we'll accumulate messages that match the criteria
	let bucket = starting_bucket;
	//logger.debug(query);
	//logger.debug(`Searching buckets ${earliest_bucket} to ${latest_bucket}, starting with ${starting_bucket} and hopping by ${search_direction}`);
	while (earliest_bucket <= bucket && bucket <= latest_bucket && options.limit > 0) { // options.limit will decrease as we gather messages
		params[0] = bucket;
		//logger.debug(`Looking for ${options.limit} messages in ${bucket}`);
		//console.log('Params:', params);//.map(param => param.toString()));
		new_messages = await db
			.execute(query, params, { prepare: true })
			.then(res => res.rows)
			.then(rows => rows.filter(a => a.message_id.lessThanOrEqual(latest)))
			.then(rows => rows.filter(a => a.message_id.greaterThanOrEqual(earliest)))
			.then(rows => rows.sort((a, b) => a.message_id.lessThan(b.message_id) ? -1 : 1))
			//.then(rows => { rows.map(JSON.stringify).map(console.log); return rows; })
			.catch(error => errors.push(error));
		// so yeah. it's possible that the db will throw an error somehow, still...idk how but i'd rather be prepared-ish
		// so if we see an error, we'll happily forward it on to the unsuspecting caller, who will now know about our database's
		// internals and not really have a clue how to fix the problem probably. yeah. sounds good
		if (errors.length) {
			throw errors;
		}
		messages.push(...new_messages);
		//console.log('======================================================================================================');
		//console.log('New messages:', new_messages);
		//console.log('Count of new messages:', new_messages.length);
		options.limit -= new_messages.length; // yeah, i think that was a pretty good idea! good job, question-asker
		//params.pop();                //
		//params.push(options.limit);  // these two lines are kil because we grab whole buckets now. see notes on Big Hole
		//logger.debug(`Leaving ${bucket}; still need ${options.limit} messages`);
		bucket += search_direction;
	}
	// so by now we've either gathered enough messages or checked all the buckets in our time frame
	// let's trim the result set down to the message limit
	messages.sort((a, b) => a.message_id.lessThan(b.message_id) ? -1 : 1);
	while (options.limit < 0) {
		messages[search_direction > 0 ? 'pop' : 'shift']();
		options.limit++;
	}
	// let's blow this popsicle stand
	//console.log(messages.map(convertTypesForDistribution));
	return messages;
};

// returns or throws
const updateMessage = async (channel_snowflake, message_snowflake, changes) => {
	const errors = [];

	if (channel_snowflake === undefined || channel_snowflake === null)
		errors.push(`A channel snowflake must be passed, but ${channel_snowflake} was supplied`);
	else channel_snowflake = coerceToLong(channel_snowflake, errors);
	if (message_snowflake === undefined || message_snowflake === null)
		errors.push(`A message snowflake must be passed, but ${message_snowflake} was supplied`);
	else message_snowflake = coerceToLong(message_snowflake, errors);
	if (changes === undefined || changes === null || changes.constructor.name !== 'Object' || Object.keys(changes).length < 1)
		errors.push(`An object describing changes to be made must be passed, but ${changes} was supplied`);
	if (errors.length) {
		throw errors;
	}

	return getMessages(channel_snowflake, {message_id: message_snowflake})
		.then(rows => rows.length > 0)
		.then(recordExists => {
			if (recordExists)
				return db.execute(...schemas.messages_by_channel_bucket.getUpdateStmt(Object.assign({}, {channel_id: channel_snowflake, message_id: message_snowflake}, changes)))
					.then(() => {})
			;
			else
				throw [`Only existing messages may be updated, but no message with id ${message_snowflake} was found in channel ${channel_snowflake}`];
		});
};

// returns or throws
const deleteMessage = async (channel_snowflake, message_snowflake) => {
	const errors = [];
	if (channel_snowflake === undefined || channel_snowflake === null)
		errors.push(`A channel snowflake must be passed, but ${channel_snowflake} was supplied`);
	else channel_snowflake = coerceToLong(channel_snowflake, errors);
	if (message_snowflake === undefined || message_snowflake === null)
		errors.push(`A message snowflake must be passed, but ${message_snowflake} was supplied`);
	else message_snowflake = coerceToLong(message_snowflake, errors);
	if (errors.length) {
		throw errors;
	}

	return db.execute(...schemas.messages_by_channel_bucket.getDeleteStmt({
		channel_id: channel_snowflake
		, message_id: message_snowflake
	})).then(() => {});
};
*/

/*************************************************************************
 * users
 */
/*
// returns description of user, or throws
const createUser = async (name, email, password, icon_snowflake) => {
	const errors = [];
	if (name === undefined || name === null)
		errors.push(`A name must be passed, but ${name} was supplied`);
	if (email === undefined || email === null)
		errors.push(`A email must be passed, but ${email} was supplied`);
	if (password === undefined || password === null)
		errors.push(`A password must be passed, but ${password} was supplied`);
	if (icon_snowflake === undefined || icon_snowflake === null)
		errors.push(`An icon snowflake must be passed, but ${icon_snowflake} was supplied`);
	else icon_snowflake = coerceToLong(icon_snowflake, errors);
	if (errors.length) {
		throw errors;
	}

	// TODO validate email using Schema::validators
	// TODO ^ Consider secondary index on emails to allow filtering by equality/fast check whether email is taken
	const used_discrims = await getUsers({name}).then(users => users.map(user => user.discriminator));
	if (used_discrims.length >= discriminator_cap)
		throw [`Too many users already have the name ${name}; please choose another name`];
	let discriminator = Math.round(Math.random()*10000);
	do {
		discriminator += 1;
		discriminator %= 10000;
	} while (used_discrims.includes(discriminator));

	// FIXME what errors can this throw? how should we handle them?
	return hasher.hash(password, hash_options)
		.catch(e => {
			logger.error(e);
			throw ['An error occurred in the process of hashing the supplied password. Please report this error to the developers, along with this number: ' + snowmachine.generate().snowflake];
		}) // use the number as a timestamp to find out when the thing happened. not very useful since none of the information is timestamped... TODO add timestamps to logger
		.then(hash => {

			const record = {
				user_id: coerceToLong(snowmachine.generate().snowflake)
				, discriminator
				, name
				, email
				, password: hash
				, icon_id: icon_snowflake
			};

			return db.execute(...schemas.users.getInsertStmt(record))
				.then(() => convertTypesForDistribution(record))
			;
		});
};

// returns list of user descriptions, or throws
const getUsers = async (options = {
	user_id: undefined
	, limit: undefined
}) => {
	const keys = Object.keys(options);
	const constraints = [];
	let limit = '';
	const params = [];
	const errors = [];

	// catch passing other junk as the options
	if (options === null || options.constructor.name !== 'Object') 
		errors.push(`An optional object containing filtering keys was expected, but ${options} was supplied`);

	addSnowflakeConstraint('user_id', 'user_id =', options, constraints, params, errors);
	limit = generateResultLimit(options.limit, params, errors);

	if (errors.length) {
		throw errors;
	}

	let opt_string = '';
	if (constraints.length) opt_string = 'WHERE ';
	opt_string += constraints.join(' AND ');
	opt_string += limit;

	// FIXME don't leak hashes! ever! what does that mean? dunno. make up your mind
	return db.execute(...schemas.users.getSelectStmt(opt_string, params))
		.then(res => res.rows)
		.then(rows => rows.map(row => { delete row.password; return row; }))
		.then(rows => rows.map(convertTypesForDistribution))
	;
};

// returns or throws
// FIXME require the user to supply their password, at least if they're changing their password. could just require for any change
// FIXME automatically change discriminator if necessary
const updateUser = async (user_snowflake, changes) => {
	const errors = [];

	if (user_snowflake === undefined || user_snowflake === null)
		errors.push(`A user snowflake must be passed, but ${user_snowflake} was supplied`);
	else user_snowflake = coerceToLong(user_snowflake, errors);
	if (changes === undefined || changes === null || changes.constructor.name !== 'Object' || Object.keys(changes).length < 1)
		errors.push(`An object describing changes to be made must be passed, but ${changes} was supplied`);
	if (changes && changes.icon_id !== undefined)
		changes.icon_id = coerceToLong(changes.icon_id, errors);

	if (errors.length) {
		throw errors;
	}

	return getUsers({user_id: user_snowflake})
		.then(rows => rows.length > 0)
		.then(recordExists => {
			if (recordExists)
				return db.execute(...schemas.users.getUpdateStmt(Object.assign({}, {user_id: user_snowflake}, changes)))
					.then(() => {})
			;
			else
				throw [`Only existing users may be updated, but no user with id ${user_snowflake} was found`];
		});
};

// returns or throws
const deleteUser = async (user_snowflake) => {
	const errors = [];
	if (user_snowflake === undefined || user_snowflake === null)
		errors.push(`A user snowflake must be passed, but ${user_snowflake} was supplied`);
	else user_snowflake = coerceToLong(user_snowflake, errors);
	if (errors.length) {
		throw errors;
	}

	return db.execute(...schemas.users.getDeleteStmt({
		user_id: user_snowflake
	})).then(() => {});
};

// returns a stringified snowflake or null, always---never throws
const authenticate = async (email, password) => {
	return db.execute('SELECT user_id, password FROM users WHERE email = ?;', [email], { prepare: true })
		//.then(res => { console.log('Response', res); return res; })
		.then(res => res.rows[0])
		.then(async pair => {
			if (await hasher.verify(pair.password, password))
				return pair.user_id.toString();
			return null;
		})
		.catch(() => null);
		//.catch((e) => {console.log(e); return null;});
};
*/

/*************************************************************************
 * icons
 */
/*
// returns description of user, or throws
const createIcon = async (url) => {
	const errors = [];
	// FIXME validate URL
	if (url === undefined || url === null)
		errors.push(`A url must be passed, but ${url} was supplied`);
	if (errors.length) {
		throw errors;
	}

	const record = {
		icon_id: coerceToLong(snowmachine.generate().snowflake)
		, url
	};

	return db.execute(...schemas.icons.getInsertStmt(record))
		.then(() => convertTypesForDistribution(record))
	;
};

const getIcon  = async (icon_id) => {
	const errors = [];
	icon_id = coerceToLong(icon_id, errors);

	if (errors.length) {
		throw errors;
	}

	return db.execute('SELECT * FROM icons WHERE icon_id = ?', [icon_id], { prepare: true })
		.then(res => res.rows)
		.then(rows => convertTypesForDistribution(rows[0]))
		.catch(e => null);
	;
};
*/
		
const createUser = async () => {throw ['Unimplemented'];};
const getUser = async () => {throw ['Unimplemented'];};
const updateUser = async () => {throw ['Unimplemented'];};
const authenticate = async () => {throw ['Unimplemented'];};
const searchUsers = async () => {throw ['Unimplemented'];};

const getCalendarsByUser = async () => {throw ['Unimplemented'];};
const getCalendarDetails = async () => {throw ['Unimplemented'];};
const getCalendarEventsByCalendar = async () => {throw ['Unimplemented'];};
const updateCalendars = async () => {throw ['Unimplemented'];};

const createFriendship = async () => {throw ['Unimplemented'];};
const acceptFriendship = async () => {throw ['Unimplemented'];};
const declineFriendship = async () => {throw ['Unimplemented'];};
const endFriendship = async () => {throw ['Unimplemented'];};

const getCalendarEventsByUser = async (user_id) => {
	const errors = [];
	user_id = coerceToLong(user_id, errors);

	if (errors.length) {
		throw errors;
	}

	return db.execute('SELECT url FROM calendars WHERE user_id = ?', [user_id], { prepare: true })
		.then(res => res.rows)
	;
};

const executeRaw = async (stmt, params) => {
	return db.execute(stmt, params, { prepare: true });
};

// [{query: '', params: []}]
const executeBatch = async (stmts) => {
	return db.batch(stmts, { prepare: true });
};

module.exports = ({db, snowmachine}) => {
	configure({db});
	return {
		schemas, executeRaw, executeBatch, db
		, createUser, getUser, updateUser, authenticate, searchUsers
		, getCalendarsByUser, getCalendarDetails, getCalendarEventsByCalendar, getCalendarEventsByUser, updateCalendars
		, createFriendship, acceptFriendship, declineFriendship, endFriendship
	//, createGuild, getGuilds, updateGuild, deleteGuild
	//, createChannel, getChannels, updateChannel, deleteChannel, clearChannels, addChannelToGuild // FIXME that last one doesn't work yet
	//, createMessage, getMessages, updateMessage, deleteMessage
	//, createUser, getUsers, updateUser, deleteUser, authenticate
	//, createIcon, getIcon, iconExists
};
}
