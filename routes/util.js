const requireAuth = (redirect) => (req, res, next) => {
	if (req.session.user_id) next();
	else res.redirect(redirect);
};

const requireNotAuth = (redirect) => (req, res, next) => {
	if (req.session.user_id) res.redirect(redirect);
	else next();
};

// use as someAsyncThing().then(yada).catch(handle(500, req, res));
const handle = (code, req, res) => {
	return (errors) => {
		if (process.env.NODE_ENV === 'debug') console.error(errors);
		res.status(code).json(errors);
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
