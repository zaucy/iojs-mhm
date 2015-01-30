# Getting Started
Install mhm via npm
```
npm install -g mhm
```

Then create a `host` folder filled with directories with the name of each host to manage.
```
/host
  /my-website.com
  /localhost
  /127.0.0.1
```

In order for `mhm` to manage each host they must include a `host.json` file with at least the key `main`. It should point to the file `mhm` should run when starting the host.

Then run mhm with the http ports you'd like your hosts to use and pointed to the host folder.

```
mhm --hosts-dir=/host --http=80,8080
```

The above command will listen on port 80 and port 8080 and all servers each host tries to create will go through the manager instead to be parsed and sent to the appropriate host.
