var cluster = require('cluster');
var NLTunnel = require('../index.js'); // require('node-local-tunnel')
//var fs = require('fs');

var options = { 
	// port : 12345,  // port to setup the tunnel, 12345 by default
	// ssl : {	// give ssl cert if you want setup a ssl secure tunnel
	// 	cert : fs.readFileSync('./ssl-cert.pem'),
	// 	key : fs.readFileSync('./ssl-key.pem')
	// },
	auth : { // set user&password for auth connection
		username:'admin',
		password:'123456'	
	}
}
if(cluster.isMaster){
	// init tunnel in master
	NLTunnel.init(options);

	for(var i = 0; i < 4; i++) {
		var child = cluster.fork();
	}
}else{
	var express = require('express'),
	app = express();

	app.use( NLTunnel.server(options) );

	app.use('/foo',function(req, res, next){
		res.send('ok on 3000')
	})
	app.use('/foo/:id',function(req, res, next){
		res.send('ok id on 3000')
	})
	app.listen(3000);
}
