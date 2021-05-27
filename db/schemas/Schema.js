#!/usr/bin/node

// TODO: enforce foreign key constraints

// This Schema class has been written for compatibility with node-postgres.
module.exports = class Schema {
	constructor(name, keys = [], requireds = [], nullables = [], immutables = [], automatics = [], update_keys = [], typeSamples = {}, validators = [], permitNulls = false) {

		// e.g. 'guilds', 'channels_by_guild'
		// this is used as a table name for generating CQL
		this.name = name;

		// list of all column names
		this.keys = keys;

		// list of all columns who must be specified in any query:
		// both new records and updates to existing records _must_
		// have these keys. this is NOT an exhaustive list of all keys
		// that must never be left null. see nullables
		this.requireds = requireds;

		// list of all columns whose values are not mandatory (may be
		// omitted when the record is created)
		// this list takes part in automatic validation
		this.nullables = nullables;

		// list of all columns whose values are immutable once a row has
		// been written
		this.immutables = immutables;

		// list of all columns whose values are generated by code in these
		// files, rather than supplied by the user/other areas of the
		// application
		// (e.g. snowflakes are generated here when a record is created)
		this.automatics = automatics;

		// list of all columns used to identify rows to be updated
		// used by this.getUpdateStmt
		this.update_keys = update_keys;

		// collection of type samples for type validation
		this.typeSamples = typeSamples;

		// list of functions that validate a schema
		// each function takes an object (proposed record) and a boolean
		// (whether to treat the object as a new record or a set of updates)
		// if the object is treated as a set of updates, some fields may be
		// omitted, whereas a new record must have all fields specified
		// (unless the record is okay with leaving things empty)
		// each function returns an array of zero or more strings, each of
		// which describes an error with the input
		this.validators = validators;

		// whether or not to ever permit a key to have a null value
		this.permitNulls = permitNulls;

		this.validators.push(Schema.getCheckForMissingKeys(this));
		this.validators.push(Schema.getCheckForTypeErrors(this));
	}

	trim(obj) {
		const out = {};
		this.keys.forEach(key => {out[key] = obj[key];});
		Object.keys(out).forEach(key => {
			if (out[key] === undefined) delete out[key];
		});
		return out;
	}

	validate(obj, isUpdate = false) {
		const errors = [];
		this.validators.forEach(v => {
			errors.push(...v(obj, isUpdate));
		});
		return errors;
	}

	get updatables() {
		return this.keys.filter(key => !this.immutables.includes(key));
	}

	// convert Long to string, etc.
	convertTypesForDb(input) {
		switch (input?.constructor.name) {
			case 'Long':
				return input.toString();
			default: return input;
		}
	}

	getInsertStmt(record) {
		record = this.trim(record);
		const errors = this.validate(record, false);
		if (errors.length) {
			throw errors;
		}

		const columns = Object.keys(record);
		const params = Object.values(record);

		const column_string = columns.map(c => c /*+ (this.typeSamples[c]?.constructor.name === 'Long' ? '::bigint' : '')*/).join(', ');
		const value_string = columns.map((_, index) => `$${index+1}`).join(', ');

		return [
			`INSERT INTO ${this.name} (${column_string}) VALUES (${value_string});`
			, params.map(this.convertTypesForDb)
		];
	}

	//getSelectStmt(criteria = '', params = []) {
	getSelectStmt(criteria) {
		criteria = this.trim(criteria);
		const columns = Object.keys(criteria).length ? 'WHERE ' + Object.keys(criteria).map((c, index) => `${c} = $${index+1}`).join(' AND ') : '';
		const params = Object.values(criteria);
		return [
			`SELECT * FROM ${this.name} ${columns};`
			, params.map(this.convertTypesForDb)
		];
	}

	getUpdateStmt(changes) {
		changes = this.trim(changes);
		const errors = this.validate(changes, true);
		if (errors.length) {
			throw errors;
		}

		const columns = [];
		const update_keys = [];
		const params = [];
		Object.keys(changes).forEach(key => {
			if (this.immutables.includes(key))
				update_keys.push(key);
			else
				columns.push(key);
		});
		for (let key of columns) params.push(changes[key]);
		for (let key of update_keys) params.push(changes[key]);
		let index = 0; // need to persist numbering from one string to the next, e.g., UPDATE Users SET first_name = $1 WHERE user_id = $2;
		const column_string = columns.map(c => `${c} = $${++index}`).join(', ');
		const key_string = update_keys.map(c => `${c} = $${++index}`).join(' AND ');

		return [
			`UPDATE ${this.name} SET ${column_string} WHERE ${key_string};`
			, params
		];
	}

	getDeleteStmt(criteria) {
		criteria = this.trim(criteria);
		const errors = [];
		// forbid deleting based on anything mutable
		for (let key of Object.keys(criteria))
			if (this.updatables.includes(key))
				errors.push(`DELETE criteria may only be immutable columns (${this.immutables.join(', ')}), but ${key} was supplied`);
		if (errors.length) {
			throw errors;
		}

		// deletion criteria are OK, so carry on
		const columns = Object.keys(criteria);
		const params = columns.map(key => criteria[key]);

		const criteria_string = columns.map((c, index) => `${c} = $${index+1}`).join(' AND ');
		return [
			`DELETE FROM ${this.name} WHERE ${criteria_string};`
			, params
		];
	}

	static getCheckForMissingKeys(_this) {
		return (obj, isUpdate) => {
			const errors = [];
			if (isUpdate) {
				// check that all requireds are supplied
				for (let key of _this.requireds)
					if (obj[key] === undefined) errors.push(`Key ${key} is required for an update, but was not supplied`);
				// check that all supplied keys are not null
				for (let key of _this.keys)
					if (!_this.permitNulls && obj[key] === null) errors.push(`Key ${key} is required for an update, but null was supplied`);
				// check that at least one mutable key is supplied
				// i.e., make sure we're actually updating something
				if (_this.keys
					.filter(key => !_this.immutables.includes(key))
					.filter(key => obj[key] !== undefined)
					.length === 0)
					errors.push(`At least one key besides [${_this.immutables.join(', ')}] must be supplied for an update, but none were`);
				/*
				else console.log(_this.keys
					.filter(key => !_this.immutables.includes(key))
					.filter(key => obj[key] !== undefined)
				);
				 */
			} else {
				// ensure that all keys that aren't optional are defined,
				// and also that all keys that are defined aren't null if nulls are not permitted
				// i.e., if !permitNulls, then an optional key can be anything but null
				for (let key of _this.keys)
					if (obj[key] === undefined && !_this.nullables.includes(key)) errors.push(`Key ${key} is required for a new record, but was not supplied`);
				else if (!_this.permitNulls && obj[key] === null) errors.push(`Key ${key} must not be null, but null was supplied`);
			}
			return errors;
		}
	}

	static getCheckForTypeErrors(_this) {
		return (obj, isUpdate) => {
			const errors = [];
			for (let key of Object.keys(_this.typeSamples))
				if (obj[key] !== undefined
					&& obj[key] !== null
					&& obj[key].constructor.name !== _this.typeSamples[key].constructor.name)
					errors.push(`Key ${key} must be of type ${_this.typeSamples[key].constructor.name}, but the supplied value ${obj[key]} is of type ${obj[key].constructor.name}`);
			return errors;
		}
	}

}
