var util = require('util');
var qs = require('querystring');

function server(options){
	options = util._extend({ssl:false, port:12345}, options);
	// 1. [server itself]connect to the ws server
	var client, path, filter;
	var serverRes = {}, serverNext = {}; // for handle req object
	var socket = require('socket.io-client')('ws'+(options.ssl?'s':'')+'://localhost:' + options.port + (options.auth ? '?username='+options.auth.username +'&password='+options.auth.password : '') );
	// 2. init self on ws server
	socket.on('connect', function(){
		console.log('[NLT] Connected to the tunnel')
		socket.emit('init', {_type:'server'});
	});
	// 3. init client obj when server give back the client info
	socket.on('client', function(data){
		if(data == false){
			client = null; path = null; filter = null;
			for(i in serverNext)
				serverNext[i]();
			serverRes = {};
			serverNext = {};
		}else{
			console.log('[NLT] remote server online')
			client = true;
			path = data.path;
			filter = data.filter;
		}
	});
	// 4. handle res from WS, then reply data in nowmal way\
	socket.on('res', function(data){
		var _rid = data._rid;
		serverRes[_rid].writeHead(data.statusCode || 200, data.headers || {});
		serverRes[_rid].write(data.err || data.res);
		serverRes[_rid].end();

		delete serverRes[_rid];
		delete serverNext[_rid];
	});
	// handle disconnect, empty everthing, go on next()
	socket.on('disconnect', function(){
		client = null; path = null; filter = null;
		for(i in serverNext)
			serverNext[i]();
		serverRes = {};
		serverNext = {};
	});

	return function(req, res, next){
		if(typeof next == 'undefined')
			next = function(){
				res.writeHead(404);
				res.write('[NLT]404 Not Found');
				res.end();
			}
		//pass to local server if the local client is online,
		if(client){
			// check path & filter
			var pass = true;
			try{
				if(path && path.length > 0){
					pass = false;
					for(i in path){
						if( path[i].match(/[\W+]$/) && req.url.match( new RegExp(path[i].slice(1,path[i].length-1)) ) ){
							pass = true;
							break;
						}else if( req.url == path[i] ){
							pass = true;
							break;
						}
					}
				}
				if(pass && filter){
					for(i in filter){
						var args = i.split('.');
						var evalString = 'req';
						for(var j = 0; j < args.length; j++){
							if(args[j].match('-'))
								evalString+='["'+args[j]+'"]';
							else evalString += '.'+args[j];
						}
						var reqValue = eval(evalString);
						if(!reqValue){
							pass = false;
							break;
						}else{
							if(filter[i] && filter[i].match(/[\W+]$/)){
								if( !reqValue.match(filter[i].slice(1,filter[i].length-1)) ){
									pass = false;
									break;
								}
							}else if( reqValue != filter[i] ){
								pass = false;
								break;
							}
						}
					}
				}
			}catch(e){
				console.log('[NLT] error', e);
				pass = false;
			}
			// only relay those passed(path & filter) requests
			if(pass){
				var _rid = Date.now();
				serverRes[_rid] = res;
				serverNext[_rid] = next;
				// check lowercase headers(e.g parsed by express), use raw headers
				for(i in req.rawHeaders){
					var header = req.rawHeaders[i].toLowerCase();
					if( header != req.rawHeaders[i] && req.headers[header] ){
						req.headers[req.rawHeaders[i]] = req.headers[header];
						delete req.headers[header];
					}
				}
				// pass the req main content to local server via WS
				if(!req.body && req.method != 'GET'){
					var body = '';
					req.on('data', function(chunk){
						body += chunk;
						//TODO: should set a limit for data
					})
					req.on('end', function(){
						req.body = qs.parse(body);
						socket.emit('req', {
							_rid : _rid,
							url : req._parsedUrl ? req._parsedUrl.href : req.url,
							headers:req.headers,
							method : req.method,
							form : req.body
						});
					})
				}else{
					socket.emit('req', {
						_rid : _rid,
						url : req._parsedUrl ? req._parsedUrl.href : req.url,
						headers:req.headers,
						method : req.method,
						form : req.body
					});
				}
				
			}else next();
		}else
			next();
	}
}
function client(options){
	options = util._extend({port:12345, ssl:false}, options);
	var request = require('request');
	var socket = require('socket.io-client')('ws'+(options.ssl?'s':'')+'://'+options.remoteHost + ':' + options.port + (options.auth ? '?username='+options.auth.username +'&password='+options.auth.password : '') );
	socket.on('connect', function(){
		console.log('[NLT] Local server online, ready to handle remote requests');
		socket.emit('init', util._extend(options,{_type:'localServer'}));
	});
	socket.on('hold', function(){
		console.log('[NLT] New client online, Sorry I have to put you on hold...')
	})
	socket.on('back', function(){
		console.log('[NLT] You are back online, ready to handle remote requests')
	})
	socket.on('req', function(data){
		// don't follow redirect and ignore https cert error
		var reqOpt = {
			followRedirect : false,
			checkServerIdentity : function(){
				return undefined;
			}
		}
		reqOpt = util._extend(reqOpt,data);
		reqOpt.url = options.localBase+data.url;
		reqOpt.encoding = null;
		// fix error [socket hang up], no need to set content-length in request headers
		delete reqOpt.headers['Content-Length'];
		// then construct a request to local server
		request(reqOpt, function(err, response, body){
			if(err)
				console.log('[NLT] relay error', err);
			else
				for(i in response.rawHeaders){
					var header = response.rawHeaders[i].toLowerCase();
					if( response.headers[header] ){
						response.headers[response.rawHeaders[i]] = response.headers[header];
						delete response.headers[header];
					}
				}
			// then send response back to main server
			socket.emit('res', {_sid: data._sid, _rid: data._rid, statusCode: response ? response.statusCode : 500, err:err?err.toString():null, res:body, headers: response ? response.headers : {}})
		})
	});
	socket.on('disconnect', function(reason){
		console.log('[NLT] Disconnect', reason);
	});
	socket.on('error', function(reason){
		console.log('[NLT] Cannot connect server:'+reason)
	})
	return function(req, res, next){
		next();
	}
}

// a relay WS server(on the main server side), help communicate bettwen main server and local/debug serverf
function init(options){
	options = util._extend({ssl:null, port:12345}, options);
	var serverWorkers = {}; // save main server sockets
	var clientSocket = []; // save local server socket
	var clientOptions = []; // save optioin obj
	var wsServer;
	if(options.ssl)
		wsServer = require('https').createServer(options.ssl);
	else wsServer = require('http').createServer();
	var io = require('socket.io')(wsServer);
	
	if(options.auth)	
	io.set('authorization', function (handshakeData, callback) {
		if(handshakeData.url.match('username='+options.auth.username+'&password='+options.auth.password))
        	callback(null, true); // error first callback style 
        else callback('no auth', false);
    });

	io.on('connection', function(socket){
		// 0. save server sockets & local socket
		socket.on('init', function(data){
			if(data._type == 'localServer'){
				socket._type = 'localServer';
				if(clientSocket.length>0)
					clientSocket.slice(-1)[0].emit('hold');			
				// then handle new one
				clientSocket.push(socket);
				clientOptions.push(data);
				// inform server the new client
				for(i in serverWorkers)
					serverWorkers[i].emit('client', data);
			}else if(data._type == 'server'){
				socket._type = 'server';
				serverWorkers[socket.id] = socket;
			}else{
				// ignore this connection
			}
		})
		// handle req from server, relay data to client
		socket.on('req', function(data){
			if(clientSocket.length > 0){
				data._sid = socket.id;
				clientSocket.slice(-1)[0].emit('req', data)
			}
		})
		// handle res from client, relay the data to the server
		socket.on('res', function(data){
			if(serverWorkers[data._sid])
				serverWorkers[data._sid].emit('res', data);
		});
		socket.on('disconnect', function(reason){
			if(socket._type == 'localServer'){
				var last = false;
				for(i in clientSocket){
					if(socket.id == clientSocket[i].id){
						if(i == clientSocket.length-1)
							last = true;
						clientSocket.splice(i, 1);
						clientOptions.splice(i,1);
						break;
					}
				}
				if(clientSocket.length > 0 && clientOptions.length > 0){
					if(last)
						clientSocket.slice(-1)[0].emit('back');	
					for(i in serverWorkers)
						serverWorkers[i].emit('client', clientOptions.slice(-1)[0]);
				}
				else
					for(i in serverWorkers)
						serverWorkers[i].emit('client', false);
			}
			else if(socket._type == 'server')
				delete serverWorkers[socket.id];
		});
	});
	wsServer.listen(options.port).on('listening', function(){
		console.log('[NLT] Tunnel is ready');
	}).on('error', function(e){
		console.log('[NLT] Cannot setup a node-local-tunnel tunnel')
	});
}

module.exports = {
	server : server,
	client : client,
	init : init
};
