var fs = require("fs");
var child_process = require("child_process");
var path = require("path");
var http = require("http");
var net = require("net");
var os = require("os");
var tmp = require("tmp");

var executablePath = process.argv[0];

module.exports = {
	createManager: createManager
};

var hosts = {};


var servers = {
	http: {},
	https: {},
	net: {}
};

function HostManager() {}

HostManager.prototype = {
	_servers: {
		http: {},
		https: {},
		net: {}
	},
	_hosts: {},
	_httpOnRequest: function(req, res, port) {
		var self = this;
		var hostname = req.headers["host"].toString();

		var colonIndex = hostname.indexOf(":");
		if(colonIndex > -1) {
			hostname = hostname.substr(0, colonIndex);
		}

		if(typeof this._hosts[hostname] == "undefined") {
			return;
		}

		var hostData = this._hosts[hostname];
		var hostpath = hostData.hostpath;
		var hostRuntimePath = hostData.runtimePath;

		fs.readFile(hostRuntimePath, function(err, data) {
			if(err) { console.log(err); return; }


			try {
				var hostRuntimeData = JSON.parse(data.toString());
			} catch(err) {
				console.log(err);
				return;
			}

			if(typeof hostRuntimeData.ports == "undefined"
			|| typeof hostRuntimeData.ports.http == "undefined"
			|| typeof hostRuntimeData.ports.http[port] == "undefined") {
				return;
			}
			var hostPort = hostRuntimeData.ports.http[port];

			var options = {
				hostname: "localhost",
				port: hostPort,
				localAddress: "127.0.0.1",
				method: req.method,
				path: req.url,
				headers: req.headers,
				auth: req.auth,
				agent: req.agent
			};

			var request = http.request(options, function(msg) {
				res.writeHead(msg.statusCode, msg.headers);

				msg.on("data", function(chunk) {
					res.write(chunk);
				});
				msg.on("end", function(chunk) {

					res.end(chunk);
				});

			});
			request.end();

		});
	},
	_notifyHost: function(hostname) {

		var self = this;

		if(this._hosts[hostname].messagePort) {
			var socket = net.createConnection(this._hosts[hostname].messagePort, "localhost", function() {
				var ports = {};
				for(var protocol in self._servers) {
					ports[protocol] = [];
					for(var port in self._servers[protocol]) {
						ports[protocol].push(parseInt(port));
					}
				}

				socket.end(JSON.stringify( {ports: ports} ));
				socket.destroy();
			});

		}
	},
	addHost: function(hostname, hostpath, callback) {
		var callback = typeof callback == "undefined" ? function(){} : callback;
		if(typeof this._hosts[hostname] != "undefined") {
			callback(Error("HostManager.addHost hostname '"+hostname+"' already exists!"));
			return;
		}

		var self = this;

		this._hosts[hostname] = {
			hostpath: hostpath
		};

		var settings = JSON.parse(fs.readFileSync(hostpath + "/host.json"));

		if(settings.main) {
			var mainScriptPath = path.resolve(hostpath, path.normalize(settings.main));
			var command = "";
			var commandPrefix = "";
			var commandPostfix ="";
			var user = settings.user || hostname;
			if(false /* Needs more testing*//*process.platform != "win32"*/) {
				commandPrefix = "su -c \"";
				commandPostfix = "\" -s /bin/sh "+user;
			}
			command += executablePath + " " + __dirname + "/host-entry.js " + "\""+ hostpath + "\" \"" + mainScriptPath + "\"";

			tmp.file({ template: os.tmpdir() + '/mhm-host-XXXXXX.json' }, function(err, tmpFilePath) {
				if(err) throw err;

				self._hosts[hostname].runtimePath = tmpFilePath;

				command += " \""+tmpFilePath+"\"";

				//command = command.replace(/\"/g, "\\\"");
				//console.log(command);

				child_process.exec(commandPrefix + command + commandPostfix, {
					cwd: hostpath
				}, function(err, stdout, stderr) {
					callback(err);
				});

				var timeoutId;
				var elapsedTime = 0;
				var checkForMessagePort = function() {

					if(elapsedTime > 10000) {
						return;
					}

					elapsedTime += 1000;

					fs.readFile(tmpFilePath, function(err, data) {
						if(err) {
							timeoutId = setTimeout(checkForMessagePort, 1000);
							return;
						}

						try {
							var runtimeData = JSON.parse(data);

							if(!runtimeData.messagePort) {
								timeoutId = setTimeout(checkForMessagePort, 1000);
								return;
							}

							self._hosts[hostname].messagePort = runtimeData.messagePort;
							self._notifyHost(hostname);
						} catch(err) {
							timeoutId = setTimeout(checkForMessagePort, 1000);
						}
					});
				};

				timeoutId = setTimeout(checkForMessagePort, 1000);

			});
		}
	},
	addServer: function(protocol, port) {
		if(Object.getOwnPropertyNames(this._hosts).length > 0) {
			throw Error("HostManager: Adding a new server after hosts have already been added is not supported.");
		}
		var self = this;
		var server, listener;

		switch(protocol.toLowerCase()) {
			case "https":
				break;
			case "http":
				if(typeof this._servers.http[port] != "undefined") throw Error("addServer server on port already exists");
				server = http.createServer();
				listener = server.listen(port);
				server.on("request", function(req, res) { self._httpOnRequest(req, res, listener.address().port); });
				this._servers.http[port] = server;
				break;
			case "net":
				break;
			default:
				throw Error("addServer invalid protocol");
		}


	}
};

function createManager(settings) {
	var manager = new HostManager;

	if(settings) {
		if(settings.servers) {
			for(var protocol in settings.servers) {
				var s = settings.servers[protocol];
				if(typeof s == "number" || typeof s == "string") {
					manager.addServer(protocol, parseInt(s));
				} else
				if(typeof s == "object") {
					for(var i in s) {
						var a = s[i];
						manager.addServer(protocol, parseInt(a));
					}
				}
			}
		}
	}

	return manager;
}
