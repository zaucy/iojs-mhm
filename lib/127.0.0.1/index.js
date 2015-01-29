var http = require("http");

http.createServer(function(req, res) {
	res.end("hi from 127.0.0.1");
}).listen(80);
