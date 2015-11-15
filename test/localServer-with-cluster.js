var cluster = require('cluster');
var NLTunnel = require('../index.js'); // require('node-local-tunnel')

// on the local server
if(cluster.isMaster){
	var options = {
		remoteHost : 'localhost',	// remote server hostname, e.g example.com
		localBase : 'http://localhost:3001', // local server base url
		path : [],	// a filter url list to be redirected by the tunnel, set it empty if you want send all requests
		filter : {	// a bypass to identify the requests, only send those fit all values below
			//ip:'[::]', 	// come which ip
			//hostname:'localhost', // from what host
			//'headers.user-agent':'[Chrome]' // example to check if user-agent is Chrome, set any match you want from the request
		},
		auth : {
			username : 'admin',
			password: '123456'
		},
		ssl: false // no ssl required
	} 
	// setUp client tunnel in master
	NLTunnel.client(options)
	for(var i = 0; i < 4; i++)
		var child = cluster.fork();
}else{
	var express = require('express'),
		app = express();

	app.get('/foo',function(req, res, next){
		res.send('ok from 3001')
	})
	app.get('/foo/:id',function(req, res, next){
		res.redirect('http://baidu.com');
	})
	app.listen(3001);
}
