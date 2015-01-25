var fs = require("fs");
var child_process = require("child_process");
var path = require("path");
var http = require("http");
var net = require("net");

var cwd = process.cwd();

var hosts = {};

var server = http.createServer();
server.on("request", function(req, res) {
  var host = req.headers["host"];
  if(typeof hosts[host] == "string") {
    var hostpath = hosts[host];
    fs.readFile(hostpath + "/.ports", function(err, data) {
      if(err) return;
      var data = data.toString();
      var httpIndex = data.indexOf("http=");
      if(httpIndex > -1) {
        var str = data.substr(httpIndex + 5);
        var eolIndex = str.indexOf("\n");
        if(eolIndex > 0)
        str = str.substr(0, str.indexOf("\n"));
        var port = parseInt(str);
        console.log("port 80 to port '%i'", port);

        var to = net.createConnection(port);
        req.pipe(to);
        to.pipe(res);

      }
    });
  }
});

server.listen(80);

function StartHost(hostname, hostpath, settings) {
  console.log("Starting Host '%s'", hostname);
  if(settings.main) {
    var mainScriptPath = path.resolve(hostpath, path.normalize(settings.main));
    child_process.exec("node " + __dirname + "/host-entry.js " + "\""+ hostpath + "\" \"" + mainScriptPath + "\"", {
      cwd: hostpath
    }, function(err, stdout, stderr) {
      if(err) throw err;
      console.log(hostname + " stdout: " + stdout);
      console.error(hostname + " stderr: " + stderr);
    });

    hosts[hostname] = hostpath;
  }
}

// Callback hell
var hostDir = cwd;
fs.readdir(hostDir, function(err, paths) {
  if(err) throw err;

  for(var pathIndex in paths) {
    (function() {
      var hostFolderPath = paths[pathIndex];
      fs.stat(hostFolderPath, function(err, stats) {
        if(err) return;
        if(stats.isDirectory()) {
          var hostFilePath = hostFolderPath + "/host.json";
          fs.stat(hostFilePath, function(err, stats) {
            if(err) return;
            if(stats.isFile()) {
              fs.readFile(hostFilePath, function(err, data) {
                if(err) return;
                try {
                  var hostObj = JSON.parse(data.toString());
                  StartHost(hostFolderPath, path.normalize(hostDir + "/" + hostFolderPath), hostObj);
                } catch(err) {
                  console.error(err);
                }
              });
            }
          });
        }
      });
    }());
  }
});
