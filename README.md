# Getting Started

Install mhm via npm
```
npm install -g mhm
```

### Using the CLI

First create a host folder and inside that host folder create a folder for each hostname.
```
/host
  /my-website.com
  /localhost
  /127.0.0.1
```

Each hostname folder should contain the file `host.json` with the key main pointing to the js file the manager should run.

Then change the current directory to your host folder you created earlier and set the http ports you'd like to manage on each host.

```
cd /host
mhm --http=80,8080
```

In the case above mhm will manage ports `80` and `8080`.

### Using mhm programmatically

Require the mhm module.

```javascript
var mhm = require("mhm");
```

Create a manager.

```javascript
var manager = mhm.createManager();
```

Add servers to manage.

```javascript
manager.addServer("htto", 80);
manager.addServer("http", 8080);

// or do it in mhm.createManager

var manager = mhm.createManager({
	servers: {
		http: [80, 8080]
	}
});
```

Add hosts.

```javascript
manager.addHost("my-website.com", "/host/my-website.com");
manager.addHost("127.0.0.1", "/host/127.0.0.1");
manager.addHost("localhost", "/host/localhost");
```
