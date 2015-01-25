var express = require("express");

var app = express();
app.listen(80);

app.use(function(req, res) {
  res.end("hi");
});
