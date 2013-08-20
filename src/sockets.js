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
module.exports = function(){
	var self = this;

	/*
	
		connect up the sockets created by DiggerServe
		
	*/

	this.digger.io.sockets.on('connection', function (socket) {

		/*
		
			these are the browser socket methods travelling via our reception connector
			
		*/
		socket.on('request', function(req, reply){
			/*
			
				it is important to map the request here to prevent properties being injected from outside
				
			*/
			self.connector({
				method:req.method,
				url:req.url,
				headers:req.headers,
				body:req.body
			}, function(error, results){
				reply({
					error:error,
					results:results
				})
			})
		})
	  
	});
}
