var _ = require('lodash');
var Auth = require('./auth');
var Client = require('digger-client');

module.exports.build_websites = function(done){
	var self = this;

	// properties that are core to digger - everything else is a website
	var reserved_props = {
		name:true,
		reception:true,
		warehouses:true
	}
	
		// scoop up the websites in the digger.yaml
	for(var prop in this.doc){
		if(!reserved_props[prop]){

			var website_config = this.doc[prop];

			/*
	
				create a $digger that has it's requests flagged as internal and from a particular website
				
			*/
			var client = Client(function(req, reply){
				req.internal = true;
				req.website = prop;

				self.connector(req, reply);
			})


			/*
			
				build the website
				
			*/
			var website = this.build_website(this.digger.express, this.reception, client, website_config);

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

	done();
}

module.exports.build_website = function(express, reception, client, website_config){
	var self = this;

	/*
	
		create a sub-app for the website
		
	*/
	var website = express();

	var web_root = website_config.document_root;
	
	if(web_root){
		self.emit('www', web_root);
		website.use(express.static(web_root));
	}

	if(website_config.auth){

		var auth = Auth(client, website_config.auth);

		self.emit('auth', website_config.auth);

		website.use(website_config.auth.url || '/auth', auth);
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