var http = require("http");
var fs = require("fs");

http.createServer(function(req, res) {
	console.log(req.url);
	res.writeHead(200, {"Content-Type": "text/html"});
	res.end(fs.readFileSync("index.html"));
}).listen(80);
