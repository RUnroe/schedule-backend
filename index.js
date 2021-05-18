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
const upload = require('multer')({ dest: __dirname + '/public/icons' });
const CassandraStore = require('cassandra-store');
const session = require("express-session");
const { createProxyMiddleware } = require('http-proxy-middleware');
logger.info('Required packages.');

logger.info('Instantiating globals...');
const app = express();
const db = require('./db/dal');
const snowmachine = new (require('snowflake-generator'))(1420070400000);
logger.info('Instantiated globals.');

logger.info("Configuring microservices...");
let routeFiles = [
	  //'api/v0/friends'
];
const micros = require('./microservices');
// whitelist routes
if (micros.routes)
	routeFiles = micros.routes;

// configure proxies
if (micros.proxies) {
	const logger = require('logger').get('proxy');
	for (let route of Object.keys(micros.proxies)) {
		logger.info(`Installing proxy middleware: ${route} -> ${micros.proxies[route]}`);
		app.use(createProxyMiddleware(route, {
			target: micros.proxies[route]
			, changeOrigin: true
		}));
	}
}
logger.info("Configured microservices.");

logger.info("Configuring Express...");
app.set("trust proxy", 1);
app.use(cors());
app.use(express.static(path.join(__dirname + "/public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
logger.info("Configured Express.");

logger.info("Configuring sessions...");
// https://blog.jscrambler.com/best-practices-for-secure-session-management-in-node/
app.use(
  session({
    secret: require('./secrets').session.secret
		, name: 'waffle.session'
    , resave: false
    , saveUninitialized: false
		, cookie: {
			httpOnly: true
			, secure: false // only run this behind a secure proxy i guess
			, sameSite: true
			, maxAge: 1000 * 60 * 60 * 24 * process.env.SESSION_LIFETIME_DAYS // ms; this is 90 days
		}
		, store: new CassandraStore({
			table: require('./secrets').session.store_table
			, client: db.db
		})
  })
);

//app.use((req, res, next) => { console.log(req.session); next(); });
logger.info("Configured sessions.");

logger.info('Configuring routes...');
const routeManager = require('./routes/manager');
routeFiles.forEach((file) => {
	logger.info(`Adding ${file} routes...`);
	let component = require(`./routes/${file}`);
	if(component.configure) component.configure({
		// pass stuff to routing files here
		// dependency injection :tm:
		db
		//, io
		, snowmachine
		, upload
	});
	routeManager.apply(app, component);
	logger.info(`Added ${file} routes.`);

});

logger.info("Configured routes.");

logger.info(`Listening on port ${process.env.HOST}:${process.env.PORT}`);

app.listen(process.env.PORT, process.env.HOST); // ??
