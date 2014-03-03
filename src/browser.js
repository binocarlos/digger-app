var Client = require('digger-client');
var Bridge = require('digger-bridge');

module.exports = function(options){

	options = options || {};

	var apiurl = options.url || '/api/v1';
	
	var handler = Bridge(apiurl);
	var $digger = Client(options);

	$digger.on('request', function(req, reply){
		handler(req, function(error, response){
			if(options.debug){
				if(error){
					console.log('-------------------------------------------');
					console.log('ERROR: ' + error);
				}
				else{
					console.log('-------------------------------------------');
					console.log('RES');
					console.log(JSON.stringify(response, null, 4));	
				}
			}
			reply(error, response);
		})
	});
	$digger.on('radio', function(){
		console.log('radio not implemented');
	})

	return $digger;
}