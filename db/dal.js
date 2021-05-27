const logger = require('logger').get('dal');

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
	const query = ['SELECT user_id, email, first_name, last_name FROM users WHERE email = $1;', [email]];
	logger.debug(JSON.stringify(query));
	return db.query(...query).then(res => res.rows.map(convertTypesForDistribution)[0]);
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
	console.log(snowmachine);
	logger.info('Configuring DAL...');
	configure({db, snowmachine});
	logger.info('Configured DAL.');
	return {
		schemas, executeRaw, executeBatch, db
		, createUser, getUserById, getUserByEmail, updateUser, authenticate, searchUsers
		, getCalendarsByUser, getCalendarDetails, getCalendarEventsByCalendar, getCalendarEventsByUser, updateCalendars
		, createFriendship, acceptFriendship, declineFriendship, endFriendship
	};
};
