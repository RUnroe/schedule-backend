-- https://stackoverflow.com/a/6804058/6627273
create or replace function create_constraint_if_not_exists (
    t_name text, c_name text, constraint_sql text
) 
returns void AS
$$
begin
    -- Look for our constraint
    if not exists (select constraint_name 
                   from information_schema.constraint_column_usage 
                   where table_name = t_name  and constraint_name = c_name) then
        execute constraint_sql;
    end if;
end;
$$ language 'plpgsql'
;

------------------------------------------------------------

-- Note that Postgres automatically indexes primary keys and
-- unique fields, so we don't have to manually index those.

CREATE TABLE IF NOT EXISTS Users (
	      user_id bigint       PRIMARY KEY UNIQUE NOT NULL
	,  first_name varchar(64)
	,   last_name varchar(64)
	,    password varchar(128)                    NOT NULL
	,       email varchar(254)             UNIQUE NOT NULL
 -- see max length of any forward- or reverse-path is 256
 -- including angle brackets, in RFC 5321 (SMTP)
);

CREATE TABLE IF NOT EXISTS Calendars (
	  calendar_id bigint       PRIMARY KEY UNIQUE NOT NULL
	,     user_id bigint                          NOT NULL REFERENCES Users (user_id) ON DELETE CASCADE ON UPDATE CASCADE
	,        name varchar(64)
	,         url varchar(2000)                   NOT NULL
);

-- If accepted is false, then User A has requested to be
-- friends with User B, and User B has neither accepted
-- nor declined the request. If User B accepts, then the
-- friendship is accepted; if User B declines, then the
-- friendship is deleted.
CREATE TABLE IF NOT EXISTS Friendships (
	friendship_id bigint       PRIMARY KEY UNIQUE NOT NULL
	,   user_a_id bigint                          NOT NULL REFERENCES Users (user_id) ON DELETE CASCADE ON UPDATE CASCADE
	,   user_b_id bigint                          NOT NULL REFERENCES Users (user_id) ON DELETE CASCADE ON UPDATE CASCADE
	,    accepted boolean                         NOT NULL
);

CREATE INDEX IF NOT EXISTS IDX_Friendships_user_a_id ON Friendships (user_a_id);
CREATE INDEX IF NOT EXISTS IDX_Friendships_user_b_id ON Friendships (user_b_id);

SELECT create_constraint_if_not_exists(
	'friendships',
	'uniq_friendships_user_pair',
	'ALTER TABLE Friendships ADD CONSTRAINT UNIQ_Friendships_user_pair UNIQUE (user_a_id, user_b_id);'
);
