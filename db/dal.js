const logger = require('logger').get('dal');
const fetch = require('node-fetch');
const ics2json = require('ics-to-json').default;

let db, snowmachine;
const configure = (obj) => {
	db = obj.db;
	snowmachine = obj.snowmachine;
};

const Long = require('long');

const hasher = require('argon2');
const hash_options = {
	type: hasher.argon2id
};
const hash = async (pw) => {
	return hasher.hash(pw, hash_options)
		.catch(err => {
			const error_id = gen_id();
			logger.error(JSON.stringify([error_id.toString(), err]));
			throw ['An error occurred while hashing the supplied password. Please report this error to the developers, along with this number: ' + error_id];
		});
};
const verify_hash = (hash, input) => hasher.verify(hash, input);

const ISO8601SimplifiedToDate = (iso, floor = true) => { // round down? or round up
	try {
		let [date, time] = iso?.split('T') || [];
		date = date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
		if (!time) return date + 'T' + (floor ? '00:00:00' : '23:59:59' ); // give up on timestamps with no time
		time = time.replace('Z','-0000'); // normalize format
		let [localtime, tz] = time.split(/(?=[-+])/);
		console.log(date, time, localtime, tz);
		localtime = localtime.replace(/(\d{2})(\d{2})/, '$1:$2'); // split hours from minutes
		localtime = localtime.replace(/(\d{2})(\d{2})/, '$1:$2'); // split minutes from seconds, if present
		tz = tz.replace(/(\d{2})(\d{2})/, '$1:$2'); // split hours from minutes
		const out = `${date}T${localtime}${tz}`;
		console.log(out);
		return out; //new Date(out).toISOString();
	} catch { return; }
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

const gen_id = (errors = []) => snowmachine.generate().snowflake.toString(); // frick longs

/*
 ** guidelines for designing these methods
 ** 
 **  - all crud operations are async and may throw an array of strings that describe errors
 **   - as many errors as possible/helpful should be thrown at once
 **  - all snowflakes should be acceptable as either strings or Longs
 **  - all snowflakes should be returned as strings
 **  - optional keys or parameters that are undefined should be ignored
 **  - optional keys or parameters with otherwise illegal values (including null) should throw errors
 **  - required keys or parameters with illegal values (including undefined and null) should throw errors
 **
 **  - all methods should take a single object with consistently-named keys
 **     e.g., getUserInfo({user_id})
 **     NOT   getUserInfo( user_id )
 **     NOT   getUserInfo({id})
 **     NOT   getUserInfo( id )
 **
 */

const createUser = async (user) => {
	const user_id = gen_id();
	const record = Object.assign({}, user, {user_id});
	return getUserByEmail({email: record.email}).then(user => {
		if (user)
			throw [`A user already exists with the email address ${record.email}`];
		schemas.User.getInsertStmt(record); // invoke validation methods and throw if we're missing a password or something; ignore the output if OK
	}).then(() => hash(record.password)
		.then(hashed_password => {
			record.password = hashed_password;
			const query = schemas.User.getInsertStmt(record);
			logger.debug(JSON.stringify(query));
			return db.query(...query).then(_ => user_id);
		})
	);
};
const getUserById = async ({user_id}) => {
	const query = schemas.User.getSelectStmt({user_id});
	logger.debug(JSON.stringify(query));
	return db.query(...query).then(res => res.rows
		.map(convertTypesForDistribution)
		.map(user => { delete user.password; return user; })
		[0]);
};
const getUserByEmail = async ({email}) => {
	const query = schemas.User.getSelectStmt({email});
	logger.debug(JSON.stringify(query));
	return db.query(...query).then(res => res.rows
		.map(convertTypesForDistribution)
		.map(user => { delete user.password; return user; })
		[0]);
};
const updateUser = async ({user_id, first_name, last_name}) => {
	const query = schemas.User.getUpdateStmt({user_id, first_name, last_name});
	logger.debug(JSON.stringify(query));
	return db.query(...query).then(res => undefined);
};
const authenticate = async ({email, password}) => {
	const query = ['SELECT user_id, password FROM users WHERE email = $1', [email]];
	logger.debug(JSON.stringify(query));
	return db.query(...query)
		.then(res => res.rows.map(convertTypesForDistribution)[0])
		.then(result => {
			if (result)
				return verify_hash(result?.password, password).then(ok => {
					if (ok) return result.user_id;
					else return undefined;
				});
			else return undefined; // should mebbe verify another hash here anyways to prevent side-channel timing attacks, except that's kinda pointless on a server with unpredictable latency...right?
		})
	;
};

// this one is a complex operation
// 1. Get a copy of the user's current calendars.
// 2. Split the work into four categories:
//    a. No-op: A record in the input matches an existing record exactly.
//    b. Create: A record in the input has an ID that does not match any existing record.
//    c. Update: A record in the input has an ID that matches an existing record, but at least one other field differs.
//    d. Delete: An existing record does not match the ID of any input record.
const updateCalendars = async ({user_id, calendars}) => {
	// format: {calendar_id, user_id, name, url, enabled}
	const _existing = await getCalendarDetails({user_id});
	const existing = Object.keys(_existing).map(calendar_id => ({
		calendar_id
		, user_id
		, name   : _existing[calendar_id].name
		, url    : _existing[calendar_id].url
		, enabled: _existing[calendar_id].enabled
	}));
	const input = Object.keys(calendars).map(calendar_id => ({
		calendar_id
		, user_id
		, name   : calendars[calendar_id].name
		, url    : calendars[calendar_id].url
		, enabled: calendars[calendar_id].enabled
	}));

	// For each input, determine whether it is new
	const newCalendars = [];
	const overlappingInputCalendars = [];
	for (let i of input)
		if (existing.map(c => c.calendar_id).includes(i.calendar_id)) {
			overlappingInputCalendars.push(i);
		} else {
			newCalendars.push(i);
		}
	// For each existing, determine whether it is to be deleted
	const deletedCalendars = [];
	const overlappingExistingCalendars = [];
	for (let e of existing)
		if (input.map(c => c.calendar_id).includes(e.calendar_id)) {
			overlappingExistingCalendars.push(e);
		} else {
			deletedCalendars.push(e);
		}
	// For each overlapping calendar, determine whether it has been changed
	const changedCalendars = [];
	for (let i of overlappingInputCalendars.map(JSON.stringify))
		if (overlappingExistingCalendars.map(JSON.stringify).includes(i)) {
		} else {
			changedCalendars.push(JSON.parse(i));
		}

	// Insert the new calendars
	for (let cal of newCalendars) {
		cal.calendar_id = gen_id();
		const query = schemas.Calendar.getInsertStmt(cal);
		logger.debug(JSON.stringify(query));
		await db.query(...query);
	}
	// Delete the deleted calendars
	for (let {calendar_id} of deletedCalendars) {
		const query = schemas.Calendar.getDeleteStmt({calendar_id});
		logger.debug(JSON.stringify(query));
		await db.query(...query);
	}
	// Update the changed calendars
	for (let cal of changedCalendars) {
		const query = schemas.Calendar.getUpdateStmt(cal);
		logger.debug(JSON.stringify(query));
		await db.query(...query);
	}
};
// Given a user ID, return all calendar details for that user
const getCalendarDetails = async ({user_id}) => {
	const query = schemas.Calendar.getSelectStmt({user_id});
	logger.debug(JSON.stringify(query));
	return db.query(...query)
		.then(res => res.rows.map(convertTypesForDistribution))
		.then(results => {
			const out = {};
			for (let row of results) {
				out[row.calendar_id] = row;
				delete out[row.calendar_id].calendar_id;
			}
			return out;
		});
};
// TODO verify that the supplied IDs are friends of the current user
// lol no
// FIXME big security hole here lmao
const getCalendarEventsByUserIds = async ({user_id, friend_ids}) => {
	const all_ids = [user_id, ...friend_ids];
	const query = [`SELECT user_id, url FROM calendars WHERE enabled = true AND user_id IN (${all_ids.map((_, index) => `$${++index}`).join(', ')});`, all_ids];
	logger.debug(JSON.stringify(query));
	return db.query(...query).then(res => res.rows
		.map(convertTypesForDistribution)
	)
		.then(async results => {
			const out = {};
			// group urls by user
			for (let user_id of all_ids) {
				out[user_id] = (
					await Promise.all(results
						.filter(cal => cal.user_id === user_id)
						.map(cal => cal.url)
						.map(url => fetch(url)
							.then(res => res.text())
							.then(res => ics2json(res)
								.map(({startDate, endDate}) => ({start: startDate, end: endDate}))
								.map(({start, end}) => ({
									start: ISO8601SimplifiedToDate(start, true)
									, end: ISO8601SimplifiedToDate(end, false)
								}))
							)
						)
					)//.catch(logger.error)// HEY if something crashes, comment this out
				).flat();
			}
			return out;
		});
};

const searchFriends = async ({user_id, user_name}) => {
	const query = [`
		SELECT
		  user_id
		, first_name||' '::text||last_name AS name
		FROM
		  users
		WHERE
		  (NOT user_id = $1)
		    AND
		  (first_name||' '::text||last_name ILIKE '%'||$2||'%')
		LIMIT 10
		;`, [user_id, user_name]];
	logger.debug(JSON.stringify(query));
	return db.query(...query)
	.then(res => {console.log(res); return res;})
	.then(res => res.rows.map(convertTypesForDistribution));
	logger.debug(JSON.stringify(query));
	throw 'Unimplemented';
};
const createFriendship = async () => {throw 'Unimplemented';};
const acceptFriendship = async () => {throw 'Unimplemented';};
const declineFriendship = async () => {throw 'Unimplemented';};
const endFriendship = async () => {throw 'Unimplemented';};

const executeRaw = async (stmt, params) => {
	return db.execute(stmt, params, { prepare: true });
};

// [{query: '', params: []}]
const executeBatch = async (stmts) => {
	return db.batch(stmts, { prepare: true });
};

module.exports = ({db, snowmachine}) => {
	logger.info('Configuring DAL...');
	configure({db, snowmachine});
	logger.info('Configured DAL.');
	return {
		schemas, executeRaw, executeBatch, db
		, createUser, getUserById, getUserByEmail, updateUser, authenticate
		, updateCalendars, getCalendarDetails, getCalendarEventsByUserIds
		, searchFriends, createFriendship, acceptFriendship, declineFriendship, endFriendship
	};
};
