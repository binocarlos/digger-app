digger-app
==========

A collection of digger modules to quickly developer an application.

## installation

```
$ npm install digger-app
```

## usage

```js
var App = require('digger-app');

// these are the various flavours of digger supplier
var Mongo = require('digger-mongo');
var Static = require('digger-static');
var Mailgun = require('digger-mailgun');

var app = App({

	// a function that intercepts requests to suppliers
	router:function(req, reply, next){

		var user = req.headers['x-json-user'];

		// the 'internal' flag means a server-side script has triggered this request
		if(req.internal && !user){
			return next();
		}

		// we can do custom routing/security logic here

		next();

	},

	suppliers:{

		// a static supplier that serves digger data from files
		'/config':Static({
				folder:__dirname + '/config'
		}),

		// a mailgun supplier that sends emails
		'/email':Mailgun({
			apikey:'...',
			domain:'...'
		}),

		// a Mongo supplier to save data
		'/orders':Mongo({
			database:'db',
			collection:'orders',
			hostname:'127.0.0.1',
			port:27017
		}),
	}
})

```