var NLTunnel = require('../index.js'); // require('node-local-tunnel')
var express = require('express'),
app = express();

NLTunnel.init(); // call init() first
//var fs = require('fs');
var options = { 
	// port : 12345,  // port to setup the tunnel, 12345 by default
	// ssl : {	// give ssl cert if you want setup a ssl secure tunnel
	// 	cert : fs.readFileSync('./ssl-cert.pem'),
	// 	key : fs.readFileSync('./ssl-key.pem')
	// }
}
app.use( NLTunnel.server(options) ); // then hannel all requests by app.use

app.use('/foo',function(req, res, next){
	res.send('ok on 3000')
})
app.use('/foo/:id',function(req, res, next){
	res.send('ok id on 3000')
})
app.listen(3000);
