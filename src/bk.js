
Application.prototype.start = function(port, done){
	console.log('-------------------------------------------');
	process.exit();
	return;
	var self = this;
	// Get document, or throw exception on error
	try {
	  var doc = require(this.config_path);
	} catch (e) {
	  throw e;
	}

	this.doc = doc;

	this.digger = DiggerServe();

	this.reception = this.build_reception(this.doc.digger);

	/*
	
		this is a supplychain function that loops into the reception

		we use it to provide our websites and scripts with a digger client
		
	*/
	this.connector = reception.connector();
	this.client = Client(connector);

	/*
	
		connect up the sockets created by DiggerServe
		
	*/

	this.digger.io.sockets.on('connection', function (socket) {

		/*
		
			these are the browser socket methods travelling via our reception connector
			
		*/
		socket.on('request', function(req, reply){
			connector(req, function(error, results){
				reply({
					error:error,
					results:results
				})
			})
		})
	  
	});

	// scoop up the websites in the digger.yaml
	var found_website = false;
	for(var prop in this.doc){
		if(prop!=='digger'){
			found_website = true;
			var website_config = this.doc[prop];

			/*
			
				build the website
				
			*/
			var website = this.build_website(digger.express, reception, website_config);
			this.websites[prop] = website;

			(website_config.domains || []).forEach(function(domain){
				self.emit('website', domain);

				/*
				
					register the domain using the main express vhost module
					(this will match the domain and serve that app)
					
				*/
				self.digger.register(domain, website);
			})
			
		}
	}

	this.digger.app.use(digger.app.router);
	this.digger.app.use('/__digger/assets', digger.express.static(path.normalize(__dirname + '/../assets')));
	this.digger.app.use(ErrorHandler());

	this.emit('loaded', doc);

	this.digger.server.listen(port, done);	
}

Application.prototype.build_reception = function(reception_config){

	var self = this;

	var routes = {};
	var router = null;

	function setup(){

		var reception = Reception({
			routes:routes,
			router:router
		})

		/*
		
			loop over the suplliers in the yaml file and build each one
			
		*/
		for(var route in reception_config.suppliers){
			var supplierobj = reception_config.suppliers[route];
			if(!suppliers[supplierobj.type]){
				throw new Error(supplierobj.type + ' is not a recognized supplier');
			}

			var supplier_config = supplierobj.config;

			_.each(supplier_config, function(value, prop){
				if(value.indexOf('path(')==0){
					supplier_config[prop] = self.filepath(value.substr(5).replace(/\)$/, ''));
				}
			})

			var supplier = suppliers[supplierobj.type](supplier_config);
			reception.digger(route, supplier);
		}

		return reception;	
	}

	/*
	
		build the reception router out of user supplied code
		
	*/
	if(reception_config.router){
		var router_path = this.filepath(reception_config.router);
		try{
			var RouterClass = require(router_path);
			router = RouterClass(client);
		}
		catch (e){
			throw e;
		}
	}

	return setup();
}

Application.prototype.build_website = function(express, reception, website_config){
	var self = this;
	
	/*
	
		create a sub-app for the website
		
	*/
	var website = express();

	var web_root = website_config.document_root;
	if(web_root){
		web_root = this.filepath(web_root);
		self.emit('www', web_root);
		website.use(express.static(web_root));
	}

	/*
	
		mount the reception onto the website
		
	*/
	var digger_path = website_config.digger;
	if(digger_path){
		website.use(digger_path, reception);
	}
	return website;
}