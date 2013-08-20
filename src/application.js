/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */

/*
  Module dependencies.
*/
var fs = require('fs');
var path = require('path');
var yaml = require('js-yaml');
var _ = require('lodash');
var util = require('util');
var ejs = require('ejs');

var EventEmitter = require('events').EventEmitter;
var ErrorHandler = require('./errorhandler');
var DiggerServe = require('digger-serve');
var Client = require('digger-client');


module.exports = Application;

function Application(options){
	options = options || {};

	var root = options.application_root;
	var config_path = path.normalize(root + '/digger.yaml');

	if(!fs.existsSync(config_path)){
		throw new Error(root + ' does not exist');
	}

	this.websites = {};
	this.root_path = path.normalize(root);
	this.config_path = config_path;
}

util.inherits(Application, EventEmitter);

Application.prototype.load_config = function(done){
	var self = this;
	var yamlstring = fs.readFileSync(this.config_path, 'utf8');

	yamlstring = ejs.render(yamlstring, {
		path:function(st){
			return self.filepath(st);
		}
	})

  var doc = yaml.safeLoad(yamlstring);

  this.emit('config', doc);

  done(null, doc);
}

Application.prototype.bootstrap = function(port, doc, done){
	var self = this;

	this.doc = doc;
	this.digger = DiggerServe();


	/*
	
		now we have the client - we can build things
		
	*/
	this.reception = this.build_reception(this.doc.reception);

	/*
	
		this is a supplychain function that loops into the reception

		we use it to provide our websites and scripts with a digger client
		
	*/
	this.connector = this.reception.connector();
	this.client = Client(this.connector);

	/*
	
		now create the suppliers
		
	*/
	this.reception.create_warehouses(this.doc.warehouses, this.client);

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



	this.digger.app.use(this.digger.app.router);
	this.digger.app.use('/__digger/assets', this.digger.express.static(path.normalize(__dirname + '/../assets')));
	this.digger.app.use(ErrorHandler());

	this.digger.server.listen(port, function(){
		self.emit('loaded', doc);
		done();
	});
}

Application.prototype.start = function(port, done){
	var self = this;
	
	this.load_config(function(error, doc){

		self.bootstrap(port, doc, function(){
			self.create_websites(done);
		});
	})

}


Application.prototype.create_websites = function(done){
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
			
				build the website
				
			*/
			var website = this.build_website(this.digger.express, this.reception, this.client, website_config);

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

Application.prototype.build_reception = require('./reception');

Application.prototype.build_website = require('./website');

Application.prototype.filepath = function(pathname){
	if(pathname.indexOf('/')!=0){
		pathname = path.normalize(this.root_path + '/' + pathname);
	}
	return pathname;
}


/*

	create an object out of user code

	pass the client to the constructor
	
*/
Application.prototype.build_module = function(path, config){
	var module_path = this.filepath(path);
	var module = null;

	try{
		var ModuleClass = require(module_path);
		module = ModuleClass(config, this.client);
	}
	catch (e){
		throw e;
	}

	return module;
}