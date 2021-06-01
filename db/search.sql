SELECT
	user_id
	, first_name||' '::text||last_name AS name
FROM
	users
WHERE
	first_name||' '::text||last_name ILIKE '%yeet%'
;

SELECT
	users.user_id
	, users.first_name||' '::text||users.last_name AS name
	, friendships.friendship_id
FROM
	users
LEFT OUTER JOIN
	friendships
ON
	(users.user_id = friendships.user_b_id)
WHERE
	(NOT users.user_id = 847628141282443264)
		AND
	(first_name||' '::text||last_name ILIKE '%joe%')
		AND
	(friendships.user_a_id IS NULL OR friendships.user_a_id = 847628141282443264)
;
