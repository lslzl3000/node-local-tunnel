var NLTunnel = require('../index.js'); // require('node-local-tunnel')
var express = require('express'),
app = express();

// on remote server, init NLT first
var options = { 
	port : 12345,  // port to setup the tunnel, 12345 by default
	// ssl : {	// give ssl cert if you want setup a ssl secure tunnel
	// 	cert : fs.readFileSync('./ssl-cert.pem'),
	// 	key : fs.readFileSync('./ssl-key.pem')
	// }，
	auth : { // set user&password for auth connection
		username:'admin',
		password:'123456'	
	}
}
NLTunnel.init(options); // call init() first
// then hannel all logic requests by app.use
app.use( NLTunnel.server(options) );

var	bodyParser = require('body-parser'),
	compression = require('compression');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static('assets/')); // if you don't want relay static files, put this line before NLT
app.use(compression());

app.use('/foo',function(req, res, next){
	console.log(req.query, req.body);
	res.send('ok on 3000')
})
app.use('/foo/:id',function(req, res, next){
	console.log(req.query, req.body, req.params.id);
	res.send('ok id on 3000')
})
app.listen(3000);
