const requireAuth = (redirect) => (req, res, next) => {
	if (req.session.user_id) next();
	else if (redirect) res.redirect(redirect);
	else res.sendStatus(401);
};

const requireNotAuth = (redirect) => (req, res, next) => {
	if (req.session.user_id) {
		if (redirect) res.redirect(redirect);
		else res.sendStatus(403); // dunno how to say "you're supposed to be not logged in, but you're logged in", so i guess Forbidden works?
	}
	else next();
};

// use as someAsyncThing().then(yada).catch(handle(500, req, res));
const handle = (req, res, code) => {
	switch (code) {
		case undefined:
		case null:
			return (errors) => {
				switch (errors?.constructor.name) {
					case 'Array': // the application code will only throw arrays, by convention that i chose
						return handle(req, res, 400)(errors); // blame the user
					default:
						return handle(req, res, 500)(errors); // who knows
				}
			}
		default:
			return (errors) => {
				if (process.env.NODE_ENV === 'debug') console.error(errors);
				res.status(code).json(errors);
			}
	}
};

const respond = (code, why, res) => {
	if(!res) throw `Missing response object`;
	res.statusMessage = why;
	res.status(code).end();
};

const requirePresenceOfParameter = (param, name, res) => {
	if(!param) {
		respond(400, `Missing parameter ${name}`, res);
		return false;
	} else return true;
};

module.exports = {
	requireAuth
	, requireNotAuth
	, handle
	, respond
	, requirePresenceOfParameter
};
