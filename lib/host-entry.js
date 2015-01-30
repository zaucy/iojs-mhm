var fs = require("fs");
var net = require("net");
var path = require("path");

if(process.argv.length > 2) {
  var hostDir = process.argv[2];
  var hostEntryPath = process.argv[3];
  var hostRuntimePath = process.argv[4];

  var runtimeData = {
    ports: {}
  };

  var updateRuntimeData = function() {
    fs.writeFile(hostRuntimePath, JSON.stringify(runtimeData));
  }

  var listenerPortOverrides = [];

  var messageServer = net.createServer();
  var messageListener = messageServer.listen(0, "localhost", function() {

    messageServer.on("connection", function(socket) {
      var data = "";
      socket.on("data", function(chunk) {
        if(chunk)
        data += chunk;
      });

      socket.on("end", function(chunk) {
        if(chunk)
        data += chunk;

        try {
          data = JSON.parse(data);
        } catch(err) {
          console.log("recieved invalid message");
        }

        if(data.ports) {
          var ports = data.ports;
          
        }
      });
    });

    runtimeData.messagePort = messageListener.address().port;
    updateRuntimeData();

  });


  process.cwd(hostDir);

  var http = require("http");
  var httpCreateServer = http.createServer;
  http.createServer = function() {
    var server = httpCreateServer.apply(this, arguments);
    var serverListen = server.listen;
    server.listen = function() {

      // If port was explicitly set.
      if(arguments.length > 0 && typeof arguments[0] == "number") {
        var port = arguments[0];
        var args = arguments;
        args[0] = 0;
        var listener = serverListen.apply(this, args);
        if(!runtimeData.ports["http"]) runtimeData.ports["http"] = {};
        runtimeData.ports.http[port] = listener.address().port;
        updateRuntimeData();
        return listener;
      }

      return serverListen.apply(this, arguments);
    };

    return server;
  };

  console.log("requiring '%s'", hostEntryPath);
  require(hostEntryPath);
}
