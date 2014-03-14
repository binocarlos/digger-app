var Client = require('digger-client');
var Bridge = require('digger-bridge');

module.exports = function(options){
	options = options || {};
	var apiurl = options.url || '/api/v1';
	
	var bridge = Bridge(apiurl);
	var $digger = Client(options);

	$digger.on('request', bridge);
	$digger.on('radio', function(){
		console.log('radio not implemented');
	})

	$digger.http = bridge.request;
	$digger.on('http', $digger.http.bind($digger));

	return $digger;
}