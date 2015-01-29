var fs = require("fs");
var path = require("path");
var mhm = require("./mhm.js");


var commands = {};
var shorthandCommands = {};



addCommand("h", "help", function() {
  console.log("Usage: mhm");
});

function addCommand() {
  var shorthand, command, func;
  if(arguments.length < 2) {
    throw Error("addCommand requires atleast 2 arguments");
  }

  if(typeof arguments[0] == "string" && typeof arguments[2] == "function") {
    shorthand = "";
    command = arguments[0];
    func = arguments[2];
  } else
  if(typeof arguments[0] == "string" && typeof arguments[1] == "string" && typeof arguments[2] == "function") {
    shorthand = arguments[0];
    command = arguments[1];
    func = arguments[2];
  } else {
    throw Error("addCommand invalid arguments");
  }

  if(typeof commands[command] != "undefined") {
    throw Error("addCommand command '"+command+"' already exists.");
  }
  if(typeof shorthandCommands[shorthand] != "undefined") {
    throw Error("addCommand shorthand '"+shorthand+"' already exists.");
  }

  commands[command] = { data: {} };
  commands[command].callback = func.bind(commands[command].data);

  shorthandCommands[shorthand] = command;
}


var manager = mhm.createManager({
  servers: {
    http: 8080
  }
});

// Callback hell
var cwd = process.cwd();
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
                  console.log("Starting host '%s'", hostFolderPath);
                  manager.addHost(hostFolderPath, path.normalize(hostDir + "/" + hostFolderPath));
                  //StartHost(hostFolderPath, path.normalize(hostDir + "/" + hostFolderPath), hostObj);
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
