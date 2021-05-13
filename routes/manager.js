const apply = (app, component) => {
	component.routes.forEach((route) => {
		if (route.uris.constructor.name !== 'Array') route.uris = [route.uris];
		if (route.methods.constructor.name !== 'Array') route.methods = [route.methods];
		if (route.handlers.constructor.name !== 'Array') route.handlers = [route.handlers];
		route.methods.forEach((method) => {
			route.uris.forEach((uri) => {
				app[method](route.uri, ...route.handlers);
				if(component.logger) component.logger.info(`Adding route: ${method.toLocaleUpperCase()} ${route.uri}`);
			});
		});
	});
};


module.exports = { apply };
