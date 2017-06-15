/*
 * Simple demo as Ngrok server, run in your public server
 */
 
var NLTunnel = require('node-local-tunnel')

// on remote server, init NLT first
var options = { 
	port : 8888,
	auth : { // set user&password for auth connection
		username:'admin',
		password:'123456'	
	}
}
// // call init() first
 NLTunnel.init(options); 

// Or you can also use pure Nodejs http server
require('http').createServer(NLTunnel.server(options)).listen(3000);