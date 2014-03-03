var EventEmitter = require('events').EventEmitter;
var util = require('util');
var Stack = require('digger-stack');
var SupplyChain = require('digger-supplychain');
var Bridge = require('digger-bridge');

function DiggerApp(config){
	EventEmitter.call(this);
	config = config || {};
	this.router = config.router;
	this.suppliers = config.suppliers || {};
}

util.inherits(DiggerApp, EventEmitter);

module.exports = DiggerApp;

DiggerApp.prototype.router = function(fn){
	if(fn){
		this.router = fn;
	}
}

DiggerApp.prototype.use = function(route, handler){
	this.suppliers[route] = handler;
}

DiggerApp.prototype.build = function(){
	var self = this;
	Object.keys(this.suppliers || {}).forEach(function(key){
		self.emit('supplier', key, self.suppliers[key]);
	})
	
	var stack = new Stack({
		router:this.router,
		suppliers:this.suppliers
	});

	function proxy(req, reply){
		stack.reception(req, reply);
	}

	var $digger = new SupplyChain();
	$digger.on('request', proxy);

	stack.client = $digger;
	stack.handler = Bridge(proxy);
	stack.proxy = proxy;

	return stack;
}

/*
var Mongo = require('digger-mongo');
var Static = require('digger-static');
var Mailgun = require('digger-mailgun');
*/

module.exports = function(config){
	return new DiggerApp(config);	
}

module.exports.client = function(stack){
	var $digger = new SupplyChain();
	function proxy(req, reply){
		stack.reception(req, reply);
	}
	$digger.on('request', proxy);
	return $digger;
}