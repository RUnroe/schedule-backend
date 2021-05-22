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

CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
	"sess" json NOT NULL,
	"expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

SELECT create_constraint_if_not_exists(
	'session',
	'session_pkey',
'ALTER TABLE "session" ADD CONSTRAINT IF NOT EXISTS "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;'
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
