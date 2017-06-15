var http = require('http');

http.createServer(function(req, res){
	res.end('ok from app server');
}).listen(3001);