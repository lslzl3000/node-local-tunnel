# Node-Local-Tunnel [NLT]
=========================

This is a live secure tunnel(a lightweight nodejs version of ngrok(https://ngrok.com) redirect public requests to your own local server behind a NAT or firewall, simplify mobile device testing, very useful to debug production server on your own mechine

Why & How it works
----------
Sometimes, we have to test or live add/del things on a public server with public domain (e.g development with public services [Wechat, Weibo, Alipay..], or mobile device testing behind NAT or firewall), which usually requires server reloading, proxy configuration, ssh login, re-deploying .... It will be much simpler if we could proxy the requests from public server to our own local mechine, and testing/debuging on the local server.
But if you are behind NAT or firewall(e.g secure network, mobile netwrok), the normal proxy engine(e.g. nginx) will not work. A principle to achieve that is setup a tunnel/connection to help you relay packages between the public server and your local server.

The ngrok(https://ngrok.com) is a well-known public service to do this. But it is a general native server written in c/c++, powerful but little heavy in most of cases. Besides, the public service is blocked in China, and setup a private ngrok server is hard and complex.

The NLT[node-local-tunnel] is a pure nodejs module, only few lines, it will setup up a live secure tunnel (by websocket), catch all/part[target ones] of the requests from one server, live redirect/relay them to a local server. Easy use, easy configure.

Installing
----------
This is a typical nodejs module, so just install by npm

    # npm install node-local-tunnel

Try examples in /test(https://github.com/lslzl3000/node-local-tunnel/tree/master/test), see how it works to redirect requests to your local server

How to use
----------
## on public/production Server
```javascript
    var app = require('express')(), // work with express
    
    var NLTunnel = require('node-local-tunnel');
    NLTunnel.init();  // init the tunnel server
    app.use( NLTunnel.server() ); // then easy relay all requests by app.use
    // works fine with express router, e.g. only relay /foo with 'GET' request  
    // app.get('/foo', NLTunnel.server() ); 
    
    // better use NLT before other middleware
    var	bodyParser = require('body-parser'),
		  cookieParser = require('cookie-parser'),
		  compression = require('compression');
		
		app.use(bodyParser.json());
		app.use(bodyParser.urlencoded());
		app.use(compression());
		app.use(cookieParser(config.cookies.signedKey));
	  
    app.use('/someurl', function(req, res, next){
      // some codes ...
    });
    .......
    app.listen(80);
```

## on local/dev Server
```javascript
    var app = require('express')(), // work with express
    
    var NLTunnel = require('node-local-tunnel');
    var options = {
      remoteHost : 'your-public-server.com',
      localBase : 'http://localhost:3000'
    };
    NLTunnel.client(options); // just call client() with options, you are free to go
    
    var	bodyParser = require('body-parser'),
		  cookieParser = require('cookie-parser'),
		  compression = require('compression');
		
		app.use(bodyParser.json())
		app.use(bodyParser.urlencoded());
		app.use(compression());
		app.use(cookieParser(config.cookies.signedKey));
	  
    app.use('/someurl', function(req, res, next){
      // some codes ...
    });
    .......
    app.listen(3000);
```

## options for public/production server
```javascript
    var options = {
      port : 12345, // which port to setup the websocket server, 12345 by default
      auth : { // tunnel auth info, you have to setup the client with same obj to connect, null by default
        username : 'admin',
        passwork : '123456'
      },
      ssl : {	// give ssl cert if you want setup a ssl secure tunnel, null by default
        cert : fs.readFileSync('./ssl-cert.pem'),
        key : fs.readFileSync('./ssl-key.pem')
      }
    };
    NLTunnel.init(options);
    app.use( NLTunnel.server(options) );
```

## options for local/dev server
```javascript
    var options = {
      remoteHost : 'public-server-domain',	// remote server hostname, e.g example.com
      localBase : 'http://localhost:3000', // local server base url
      path : [ '/foo' ],	// a filter to check req.url, set it empty if you want relay all requests
      filter : {	// a bypass to identify requests, only relay those who fit all values in req obj
        // some useful examples, you set any target to match what you want from the request obj
        ip:'[127.0.0.1]', 	// match req.ip, check from which ip comes from 127.0.0.1
        hostname:'localhost', // match req.hostnem, check from which host
        'headers.user-agent':'[Chrome]' // check req.headers[user-agent], check if chrome
      },
      auth : { // auth info to connect to the relay server 
        username : 'admin',
        password: '123456'
      },
      ssl: false // true if server ssl enabled, false by default
    };
    NLTunnel.client(options) );
```

path & filter rules
-------------------

NLT uses pure string to check target path or filter, but if the string packaged with '[]', it will be transger into Regex object to match the target, e.g.

    path : [ '/foo', '/getOrder']

which means we only want req.url only **equles to** '/foo' or '/getOrder', but

    path : [ '[/foo]', '[/getOrder/\\W+]']

means we want to relay all requests whose url **match** '/foo' (e.g. '/foo','/foolish','/foo/name'...) and '/getOrder/...' (e.g. '/getOrder/name', '/getOrder/:order_id')

The same rule apply with opionts.filter, e.g.

    hostname : 'example.com' // means filter those hostname **equles to** 'example.com'
    hostname : '[example.com]' // means filter those hostname **match** 'example.com', which also contains 'sub.example.com'

If you want to check sub-layer object value in req obj(e.g cookies or userAgent), just write it, e.g.

    'headers.user-agent' : '[Chrome]' // check user-agent value in headers, match target words
    'headers.cookie' :  '[login=true]' // check cookie value in headers, match target words

Limitation & work to do
-----------------------

This is a very simple module rightnow, bugs should be found, please welcome to send issues.
Currently, the relay server only send four common values from req Express object in public server

    url : req._parsedUrl.href,
    headers : req.headers,
    method : req.method,
    body : req.body

and send back four main values from dev server 

    statusCode : res.statusCode,
    err : err,
    res : body,
    headers : res.headers

This is works fine with Express, but not test raw nodejs request yet. Please welcome to make changes to enable more custom features (.e.g multi-part) for this module.







