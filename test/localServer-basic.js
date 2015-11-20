var NLTunnel = require('../index.js'); // require('node-local-tunnel')
var express = require('express'),
	app = express();

// in dev server, the client will work as proxy itself, just setup the tunnel with options
var options = {
	port : 12345, // remote NLT port, 12345 by default
	remoteHost : 'localhost',	// remote server hostname, e.g example.com
	localBase : 'http://localhost:3001', // local server base url
	path : [],	// a filter url list to be redirected by the tunnel, set it empty if you want send all requests
	filter : {	// a bypass to identify the requests, only send those fit all values below
		ip:'[::]', 	// come which ip (req.ip is powered by Express, you may need to find ip in other framework or pure Nodejs)
		hostname:'localhost', // from what host (same above, req.hostname is powered by Express)
		'headers.user-agent':'[Chrome]' // example to check if user-agent is Chrome, set any match you want from the request
	},
	auth : {
		username : 'admin',
		password: '123456'
	},
	ssl: false // no ssl required
} 
// setUp client tunnel 
NLTunnel.client(options)

var	bodyParser = require('body-parser'),
	compression = require('compression');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(compression());
app.use(express.static('assets/'));

app.use('/foo',function(req, res, next){
	console.log('querys:', req.query, 'body:', req.body);
	res.send('ok from 3001')
})
app.use('/foo/:id',function(req, res, next){
	console.log('querys:', req.query, 'body:', req.body, 'params:', req.params.id);
	res.send('ok from 3001')
})
app.listen(3001);

