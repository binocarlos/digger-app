var _ = require('lodash');
var Reception = require('digger-reception');

var suppliers = {
	'mongo':require('digger-mongo'),
	'static':require('digger-static')
}

module.exports = function(reception_config){

	var self = this;

	var routes = {};
	var router = null;

	function setup(){

		var reception = Reception({
			routes:routes,
			router:router
		})

		/*
		
			now we create the suppliers with a client onto ourself
			
		*/
		reception.create_suppliers = function(client){
			
			/*
			
				loop over the suplliers in the yaml file and build each one
				
			*/
			for(var route in reception_config){
				var supplierobj = reception_config[route];
				if(!suppliers[supplierobj.type]){
					throw new Error(supplierobj.type + ' is not a recognized supplier');
				}

				var supplier_config = supplierobj.config;
				var supplier = suppliers[supplierobj.type](supplier_config);
				reception.digger(route, supplier);
			}
		}

		return reception;	
	}

	/*
	
		build the reception router out of user supplied code
		
	*/
	if(reception_config.router){
		router = this.build_module(reception_config.router);
	}

	return setup();
}