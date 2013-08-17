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

var util = require('util');

var EventEmitter = require('events').EventEmitter;

var DiggerServe = require('digger-serve');
var Reception = require('digger-reception');

var suppliers = {
	'mongo':require('digger-mongo')
}

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

Application.prototype.filepath = function(pathname){
	if(pathname.indexOf('/')!=0){
		pathname = path.normalize(this.root_path + '/' + pathname);
	}
	return pathname;
}

Application.prototype.start = function(port, done){
	var self = this;
	// Get document, or throw exception on error
	try {
	  var doc = require(this.config_path);
	} catch (e) {
	  throw e;
	}

	this.doc = doc;

	var digger = DiggerServe();

	var reception_config = this.doc.digger;
	var reception = this.build_reception(reception_config);

	// scoop up the websites in the digger.yaml
	var found_website = false;
	for(var prop in this.doc){
		if(prop!=='digger'){
			found_website = true;
			var website_config = this.doc[prop];
			var website = this.build_website(digger.express, reception, website_config);
			this.websites[prop] = website;

			(website_config.domains || []).forEach(function(domain){
				self.emit('website', domain);
				digger.register(domain, website);
			})

			
		}
	}

	/*
	
		the 404 handler
		
	*/
	digger.app.use('/__digger/assets', digger.express.static(path.normalize(__dirname + '/../assets')));
	digger.app.use(digger.app.router);
	digger.app.use(function(req, res, next){
		res.statusCode = 404;
		res.sendfile(path.normalize(__dirname + '/../assets/404.html'));
	})

	this.emit('loaded', doc);

	digger.server.listen(port, done);	
}

Application.prototype.build_reception = function(reception_config){
	var reception = Reception();

	for(var route in reception_config.suppliers){
		var supplierobj = reception_config.suppliers[route];
		if(!suppliers[supplierobj.type]){
			throw new Error(supplierobj.type + ' is not a recognized supplier');
		}
		var supplier = suppliers[supplierobj.type](supplierobj.config);
		reception.digger(route, supplier);
	}

	return reception;
}

Application.prototype.build_website = function(express, reception, website_config){
	var self = this;
	
	var website = express();

	var web_root = website_config.document_root;
	if(web_root){
		web_root = this.filepath(web_root);
		self.emit('www', web_root);
		website.use(express.static(web_root));
	}

	var digger_path = website_config.digger;
	if(digger_path){
		website.use(digger_path, reception);
	}
	return website;
}