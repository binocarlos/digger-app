var _ = require('lodash');
var goauth = require('goauth');

module.exports = function(express, reception, client, website_config){
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

	if(website_config.auth){

		var paths = website_config.auth.paths || {};

		/*
		
			connect to the backend warehouse that contains our users
			
		*/
		var userwarehouse = client.connect(website_config.auth.warehouse);

		var auth = goauth({
			paths:{
				login:paths.login || '/login',
				register:paths.register || '/register',
				connect:paths.connect || '/connect'
			}
		})

		auth.on('login', function(data, callback){

			/*
			
				load the user based on the username -> id
				
			*/
			userwarehouse('#' + data.username).ship(function(user){
				if(user.isEmpty() || user.attr('password')!=data.password){
					callback('invalid details');
				}
				else{
					callback(null, user.get(0));
				}
			})
			
		})

		auth.on('register', function(data, callback){
			console.log('-------------------------------------------');
			console.log('register');
		})

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