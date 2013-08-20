var _ = require('lodash');
var Auth = require('./auth');

module.exports = function(express, reception, client, website_config){
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