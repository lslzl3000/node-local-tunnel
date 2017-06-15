/*
 * Simple demo as Ngrok client, run this in your local network
 */

var NLTunnel = require('node-local-tunnel')

// in dev server, the client will work as proxy itself, just setup the tunnel with options
var options = {
	port : 8888, // remote NLT port, 12345 by default
	remoteHost : 'localhost',	// remote server hostname, e.g example.com or ip
	localBase : 'http://localhost:3001', // relay to where? your app server base url
	auth : {
		username : 'admin',
		password: '123456'
	},
	ssl: false // no ssl required
} 
// setUp client tunnel 
NLTunnel.client(options)

