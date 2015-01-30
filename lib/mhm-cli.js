var fs = require("fs");
var path = require("path");
var mhm = require("./mhm.js");

var hostsDir = process.cwd();

var commands = {};
var shorthandCommands = {};

var httpPorts = [];

var bDeveloperMode = false;

addCommand("help", { description: "Displays this." }, function() {
  console.log();
  console.log("  Usage: mhm [-xyz [, --flag-name=value]]");
  console.log();

  var commandMessages = {};
  var largestMessageLength = 0;

  for(var commandName in commands) {
    var command = commands[commandName];
    var shorthand = "";
    for(var s in shorthandCommands) {
      if(shorthandCommands[s] == commandName) { shorthand = s; break; }
    }

    var displayMessage = "";

    displayMessage += "    ";
    if(shorthand) {
      displayMessage += "-"+shorthand+",";
    }
    displayMessage += "--" + commandName + "";

    if(command.data.valueDescription) {
      displayMessage += "="+command.data.valueDescription;
    }

    if(largestMessageLength < displayMessage.length) largestMessageLength = displayMessage.length;

    commandMessages[commandName] = displayMessage;
  }

  for(var commandName in commands) {

    var command = commands[commandName];

    if(command.data.description) {
      var description = command.data.description;
      var maxLineLength = 30;
      var rows = Math.ceil(description.length / maxLineLength);

      var displayMessage = commandMessages[commandName];

      var descriptionChunk = description.substr(0, maxLineLength);
      description = description.substr(maxLineLength);
      if(descriptionChunk.length == maxLineLength)
      while(descriptionChunk.substr(-1) != " ") {
        description = descriptionChunk.substr(-1) + description;
        descriptionChunk = descriptionChunk.substr(0, descriptionChunk.length-1);
      }

      console.log(commandMessages[commandName] + " ".repeat(largestMessageLength - displayMessage.length + 4) + descriptionChunk);

      for(var i=1; rows > i; i++) {
        var descriptionChunk = description.substr(0, maxLineLength);
        description = description.substr(maxLineLength);
        if(descriptionChunk.length == maxLineLength)
        while(descriptionChunk.substr(-1) != " ") {
          description = descriptionChunk.substr(-1) + description;
          descriptionChunk = descriptionChunk.substr(0, descriptionChunk.length-1);
        }

        console.log(" ".repeat(largestMessageLength + 4) + descriptionChunk);
      }

      console.log();
    }
  }

  process.exit(0);
});

addCommand("hosts-dir", {
  description: "Sets the directory where mhm will look for hosts. If it is not set the current directory will be used."
}, function(val) {
  if(val) {
    hostsDir = val;
  } else {
    console.log("--hosts-dir requires a value");
  }
});

addCommand("h", "http", {
  description: "Sets the http ports allowed for each host. Default is 80."
}, function(val) {
  if(!val) {
    if(bDeveloperMode) val = "8080";
    else val = "80";
  }

  var ports = val.split(",");

  for(var portIndex in ports) {
    httpPorts.push(parseInt(ports[portIndex]));
  }
});

addCommand("d", "developer-mode", {
  description: "Enables developer logs and changes some defaults.",
  valueDescription: "<on|off>"
}, function(val) {
  if(val == "on" || val == "true" || val == "1") {
    bDeveloperMode = true;
  } else
  if(val == "off" || val == "false" || val == "0") {
    bDeveloperMode = false;
  }
});


function addCommand() {
  var shorthand, command, func, data;
  if(arguments.length < 2) {
    throw Error("addCommand requires atleast 2 arguments");
  }

  var i = 0;

  if(typeof arguments[0] == "string" && typeof arguments[1] != "string") {
    shorthand = "";
    command = arguments[0];
    i=1;
  } else
  if(typeof arguments[0] == "string" && typeof arguments[1] == "string") {
    shorthand = arguments[0];
    command = arguments[1];
    i=2;
  }

  for(;arguments.length > i; i++) {
    var arg = arguments[i];
    if(typeof arg == "function" && !func) {
      func = arg;
    } else
    if(typeof arg == "object" && !data) {
      data = arg;
    } else {
      throw Error("addCommand Invalid arguments.");
    }
  }

  if(!data) {
    data = {};
  }

  if(!func) {
    throw Error("addCommand no function given!");
  }

  if(typeof commands[command] != "undefined") {
    throw Error("addCommand command '"+command+"' already exists.");
  }
  if(typeof shorthandCommands[shorthand] != "undefined") {
    throw Error("addCommand shorthand '"+shorthand+"' already exists.");
  }

  commands[command] = { data: data };
  commands[command].callback = func.bind(commands[command].data);

  if(shorthand) {
    shorthandCommands[shorthand] = command;
  }
}

function callCommand(command, value) {
  var commandObj = commands[command];
  if(commandObj) {
    commandObj.callback(value);
  } else {
    console.log("Command '%s' is invalid", command);
  }
}

function processArgvCommands() {

  for(var argIndex in process.argv) {
    var arg = process.argv[argIndex];
    if(arg.substr(0, 2) == "--") {
      var eqlIndex = arg.indexOf("=");
      if(eqlIndex == -1) {
        callCommand(arg.substr(2), "");
      } else {
        callCommand(arg.substring(2, eqlIndex), arg.substr(eqlIndex+1));
      }
    } else
    if(arg[0] == "-") {
      for(var i=1; arg.length > i; i++) {
        var c = arg[i];
        var command = shorthandCommands[c];
        if(command) {
          callCommand(shorthandCommands[c], "");
        } else {
          console.log("Unrecognized shorthand '%s'", c);
        }
      }
    }
  }
}

processArgvCommands();


var manager = mhm.createManager({
  servers: {
    http: httpPorts
  }
});

// Callback hell
fs.readdir(hostsDir, function(err, paths) {
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
                  manager.addHost(hostFolderPath, path.normalize(hostsDir + "/" + hostFolderPath));
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
