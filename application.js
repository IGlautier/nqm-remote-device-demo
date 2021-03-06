/**
 * Created by toby on 19/10/15.
 */

module.exports = (function() {
  "use strict";
  var log = require("debug")("nqm:application");
  var express = require('express');
  var http = require("http");
  var url = require("url");
  var querystring = require("querystring");
  var util = require("util");
  var _tdxConnection = require("./tdxConnection");
  var _appServer = require("./appServer");
  var _ = require("lodash");
  var _tdxAccessToken = "";
  var _subscriptionManager = require("./subscription-manager");
  var _cache = require("./cache.js");


  var tdxConnectionHandler = function(err, reconnect) {
    if (!err) {
      log("tdx %s", (reconnect ? "re-connected" : "connected"));
      if (_tdxAccessToken) {
        _subscriptionManager.setAccessToken(_tdxAccessToken);
      }
    } else {
      log("tdx connection failed: %s",err.message);
    }
  };
  
  var _start = function(config) {  


    
    var app = express();
  
    app.set("views", __dirname + "/views");
    app.set('view engine', 'jade');
    app.use(express.static(__dirname  + '/public'));
    app.use('/viewer', express.static('node_modules/node-viewerjs/release'));

    app.get('/', function (req, res) {
      if (!_tdxAccessToken || _tdxAccessToken.length === 0) {
        res.redirect("/login");
      } else {
        res.render("apps", { config: config });
      }
    });
    
    app.get("/login", function(req, res) {
      res.render("login");
    });
  
    app.get("/auth", function(request, response) {
      var oauthURL = util.format("%s/?rurl=%s/oauthCB", config.authServerURL, config.hostURL);
      response.writeHead(301, {Location: oauthURL});
      response.end();
    });
    
    app.get("/oauthCB", function(request, response) {
      var up = url.parse(request.url);
      var q = querystring.parse(up.query);
      if (q.access_token) {
        _tdxAccessToken = q.access_token;
        _subscriptionManager.setAccessToken(q.access_token);
        response.writeHead(301, {Location: config.hostURL});
        response.end();
      }
    });
    
    app.get("/files", function(request, response) {

      if (!_tdxAccessToken || _tdxAccessToken.length === 0) response.redirect("/login");

      else {
        _cache.getFiles(response, _tdxAccessToken);
        
      }
    });
    
    app.get("/logout", function(request, response) {
      _tdxAccessToken = "";
      _tdxLogin("");
      response.redirect("/login");
    });
        
    var server = app.listen(config.port, config.hostname, function () {
      var host = server.address().address;
      var port = server.address().port;
      log('listening at http://%s:%s', host, port);
    });
  
    _tdxConnection.start(config, tdxConnectionHandler);
    _appServer.start(config, server, _tdxConnection);
    _subscriptionManager.initialise(config, _tdxConnection, _appServer);
  };
  
  return {
    start: _start
  };
}());
