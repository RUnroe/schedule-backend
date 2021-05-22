#!/usr/bin/node

process.env.NODE_ENV = "debug";
const package = require("./package.json");

console.log(`Starting ${package.name} v${package.version}`);
require("dotenv").config();
const logger = require("logger").get("main");

logger.info('Requiring packages...');
const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
logger.info('Required packages.');

logger.info('Instantiating globals...');
const app = express();
const { session } = require('./db/init');
const snowmachine = new (require('snowflake-generator'))(1420070400000);
logger.info('Instantiated globals.');

logger.info("Configuring Express...");
app.set("trust proxy", 1);
app.use(cors());
app.use(express.static(path.join(__dirname + "/public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(require('cookie-parser')(require('./secrets').session.secret));
app.use(session);
logger.info("Configured Express.");

//logger.info("Configuring sessions...");
// https://blog.jscrambler.com/best-practices-for-secure-session-management-in-node/
//app.use(
//  session({
//    secret: require('./secrets').session.secret
//		, name: 'waffle.session'
//    , resave: false
//    , saveUninitialized: false
//		, cookie: {
//			httpOnly: true
//			, secure: false // only run this behind a secure proxy i guess
//			, sameSite: true
//			, maxAge: 1000 * 60 * 60 * 24 * process.env.SESSION_LIFETIME_DAYS // ms; this is 90 days
//		}
//		, store: new CassandraStore({
//			table: require('./secrets').session.store_table
//			, client: db.db
//		})
//  })
//);

//app.use((req, res, next) => { console.log(req.session); next(); });
//logger.info("Configured sessions.");

logger.info('Configuring routes...');
const routeFiles = [
	  'api/v0/friends'
	, 'api/v0/calendars'
];
const routeManager = require('./routes/manager');
routeFiles.forEach((file) => {
	logger.info(`Adding ${file} routes...`);
	const component = require(`./routes/${file}`);
	if(component.configure) component.configure({
		// pass stuff to routing files here
		// dependency injection :tm:
		//db
		//, io
		//, snowmachine
		//, upload
	});
	routeManager.apply(app, component);
	logger.info(`Added ${file} routes.`);

});

logger.info("Configured routes.");

logger.info(`Listening on port ${process.env.HOST}:${process.env.PORT}`);

app.listen(process.env.PORT, process.env.HOST); // ??
