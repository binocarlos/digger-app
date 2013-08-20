var _ = require('lodash');
var goauth = require('goauth');

module.exports = function(client, config){
	var self = this;

	var paths = config.paths || {};

	/*

			connect to the backend warehouse that contains our users
		
	*/
	var userwarehouse = client.connect(config.warehouse);

	/*
	
		load the user with the given username to use for login and register check
		
	*/
	function load_user(username, callback){
		/*
		
			load the user based on the username -> id
			
		*/
		userwarehouse('user[username=' + username + ']')
			.ship(function(user){
				if(user.isEmpty()){
					callback('no user found');
				}
				else{
					callback(null, user);
				}
			})
			.fail(function(error){
				callback(error);
			})
	}

	/*
	
		insert a new user into the warehouse
		
	*/
	function create_user(data, callback){

		data._password = data.password;
		delete(data.password);

		var user = client.container('user', data);

		userwarehouse
			.append(user)
			.ship(function(){
				callback(null, user.get(0));
			})
			.fail(function(error){
				callback(error);
			})
		
	}

	/*
	
		the goauth setup
		
	*/
	var auth = goauth({
		paths:{
			login:paths.login || '/login',
			register:paths.register || '/register',
			connect:paths.connect || '/connect'
		}
	})

	auth.on('login', function(data, callback){

		load_user(data.username, function(error, user){
			if(error || !user || user.attr('_password')!=data.password){
				callback('invalid details');
			}
			else{
				callback(null, user.get(0));
			}
		})

	})

	auth.on('register', function(data, callback){
		load_user(data.username, function(error, user){

			if(!error || user){
				callback('user ' + data.username + ' already exists')
				return;
			}

			create_user(data, callback);

		})
	})

	return auth;
}