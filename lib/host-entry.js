var fs = require("fs");

if(process.argv.length > 2) {
  var hostDir = process.argv[2];
  var hostEntryPath = process.argv[3];

  process.cwd(hostDir);

  var http = require("http");
  var httpCreateServer = http.createServer;
  http.createServer = function() {
    var server = httpCreateServer.apply(this, arguments);
    var serverListen = server.listen;
    server.listen = function() {

      if(arguments.length > 0 && typeof arguments[0] == "number") {
        var port = arguments[0];
        if(port == 80) {
          var args = Array.prototype.slice.call(arguments, 1, arguments.length);
          var listener = serverListen.apply(this, args);
          console.log("replacing port 80 with port %i", port);
          fs.writeFileSync(".ports", "http="+listener.address().port);
          return listener;
        }
      }

      return serverListen.apply(this, arguments);
    };

    return server;
  };

  console.log("requiring '%s'", hostEntryPath);
  require(hostEntryPath);
}
