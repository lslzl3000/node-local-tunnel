/*
 * You can run this in a public server, make it a persion relay server
 * then use NLT.client() in everwhere you want
 */
 
var NLTunnel = require('../index.js'); // require('node-local-tunnel')
var express = require('express'),
app = express();

// on remote server, init NLT first
var options = { 
	port : 12345,
	auth : { // set user&password for auth connection
		username:'admin',
		password:'123456'	
	}
}
// call init() first
NLTunnel.init(options); 
// then hannel all requests to NLT
app.use( NLTunnel.server(options) );
app.listen(3000);
