use waffle;

CREATE TABLE users_by_id (
	user_id bigint,
	first_name text,
	last_name text,
	PRIMARY KEY (user_id)
);

CREATE TABLE users_by_name (
	user_id bigint,
	name text,
	PRIMARY KEY (name) // oh god
);

CREATE TABLE users_by_login (
	user_id bigint,
	login text,
	password text,
	PRIMARY KEY 
