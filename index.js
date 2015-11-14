var util = require('util');

function server(options){
	options = util._extend({ssl:false, port:12345}, options);
	// 1. [server itself]connect to the ws server
	var client, path, auth;
	var serverRes = {}, serverNext = {}; // for handle req object
	var socket = require('socket.io-client')('ws'+(options.ssl?'s':'')+'://localhost:' + options.port );
	// 2. init self on ws server
	socket.on('connect', function(){
		console.log('[NLT] Connected to the tunnel')
		socket.emit('init', {_type:'server'});
	});
	// 3. init client obj when server give back the client info
	socket.on('client', function(data){
		if(data == false){
			client = null; path = null; auth = null;
			for(i in serverNext)
				serverNext[i]();
			serverRes = {};
			serverNext = {};
		}else{
			console.log('[NLT] remote server online')
			client = true;
			path = data.path;
			auth = data.auth;
		}
	});
	// 4. handle res from WS, then reply data in nowmal way\
	socket.on('res', function(data){
		var _rid = data._rid;
		if(data.headers){
			for(i in data.headers)
				serverRes[_rid].setHeader(i, data.headers[i])
		}
		if(data.err){
			serverRes[_rid].status(data.statusCode).send(data.err);
		}else
		serverRes[_rid].status(data.statusCode).send(data.res);

		delete serverRes[_rid];
		delete serverNext[_rid];
	});
	// handle disconnect, empty everthing, go on next()
	socket.on('disconnect', function(){
		client = null; path = null; auth = null;
		for(i in serverNext)
			serverNext[i]();
		serverRes = {};
		serverNext = {};
	});

	return function(req, res, next){
		//pass to local server if the local client is online,
		if(client){
			// check path & auth
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
				if(pass && auth){
					for(i in auth){
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
							console.log(auth[i], auth[i].match(/[\W+]$/));
							if(auth[i] && auth[i].match(/[\W+]$/)){
								if( !reqValue.match(auth[i].slice(1,auth[i].length-1)) ){
									pass = false;
									break;
								}
							}else if( reqValue != auth[i] ){
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
			// only relay those passed(path & auth) requests
			if(pass){
				var _rid = Date.now();
				serverRes[_rid] = res;
				serverNext[_rid] = next;
				// pass the req main content to local server via WS
				socket.emit('req', {
					_rid : _rid,
					url : req._parsedUrl.href,
					headers:req.headers,
					method : req.method,
					body : req.body
				});
			}else next();
		}else
			next();
	}
}
function client(options){
	options = util._extend({port:12345, ssl:false}, options);
	var request = require('request');
	var socket = require('socket.io-client')('ws'+(options.ssl?'s':'')+'://'+options.remoteHost + ':' + options.port );
	socket.on('connect', function(){
		console.log('[NLT] Local server online, ready to handle remote requests');
		socket.emit('init', util._extend(options,{_type:'localServer'}));
	});
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
		// construct a request to local server
		request(reqOpt, function(err, response, body){
			// then send response back to main server
			socket.emit('res', {_sid: data._sid, _rid: data._rid, statusCode: response.statusCode, err:err, res:body, headers:response.headers})
		})
	});
	socket.on('disconnect', function(){
		console.log('[NLT] Disconnect');
	});
	return function(req, res, next){
		next();
	}
}

// a relay WS server(on the main server side), help communicate bettwen main server and local/debug serverf
function init(options){
	options = util._extend({ssl:null, port:12345}, options);
	var serverWorkers = {}; // save main server sockets
	var clientSocket; // save local server socket
	var path, auth; // save path & auth obj
	var wsServer;
	if(options.ssl)
		wsServer = require('https').createServer(options.ssl);
	else wsServer = require('http').createServer();
	var io = require('socket.io')(wsServer);
	io.on('connection', function(socket){
		// 0. save server sockets & local socket
		socket.on('init', function(data){
			if(data._type == 'localServer'){
				socket._type = 'localServer';
				clientSocket = socket;
				if(data.path)
					path = data.path;
				if(data.auth)
					auth = data.auth;

				for(i in serverWorkers)
					serverWorkers[i].emit('client', data);
			}else{
				socket._type = 'server';
				serverWorkers[socket.id] = socket;
			}
		})
		// handle req from server, relay data to client
		socket.on('req', function(data){
			if(clientSocket){
				data._sid = socket.id;
				clientSocket.emit('req', data)
			}
		})
		// handle res from client, relay the data to the server
		socket.on('res', function(data){
			if(serverWorkers[data._sid])
				serverWorkers[data._sid].emit('res', data);
		});
		socket.on('disconnect', function(){
			if(socket._type == 'localServer')
			{
				for(i in serverWorkers)
					serverWorkers[i].emit('client', false);
			}else
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
