//jshint esversion:6

const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./lib/config');
const fs = require('fs');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');

//Instalib/datae the HTTP Server
const httpServer = http.createServer(function(req, res){
  unifiedServer(req, res);
});
//Start the HTTP Server
httpServer.listen(config.httpPort, function(){
  console.log("Server is running on port "+ config.httpPort);
});

//Instantiate the HTTPS server
const httpsServerOptions = {
  key: fs.readFileSync("./https/key.pem"),
  cert: fs.readFileSync("./https/cert.pem")
};
const httpsServer = https.createServer(httpsServerOptions,function(req, res){
  unifiedServer(req, res);
});

//Start the HTTPS Server
httpsServer.listen(config.httpsPort, function(){
  console.log("Server is running on port "+ config.httpsPort);
});
//All the server logic for both the http and https Server
var unifiedServer = function(req, res){

  let parseUrl = url.parse(req.url, true);
  let path = parseUrl.pathname;
  let trimmedPath = path.replace(/^\/+|\/+$/g,"");

  let method = req.method.toLowerCase();

  //Get the query string as an object
  let queryStringObject = parseUrl.query;

  //Get headers as an object
  let headers = req.headers;

  //Get the payload, if any
  let decoder = new StringDecoder("utf-8");
  let buffer = "";
  req.on("data", function(data){
    buffer += decoder.write(data);
  });
  req.on("end", function(){
    buffer += decoder.end();

    //Choose the handler this request go to (if it not found send to handler notfound).
    let chosenHandler = typeof(router[trimmedPath]) !== "undefined" ? router[trimmedPath]: handlers.notFound;

    //construct the data object ot send to the handler
  let data = {
    "trimmedPath" : trimmedPath,
    "queryStringObject" : queryStringObject,
    "method" : method,
    "headers" : headers,
    "payload" : helpers.parseJsonToObject(buffer)
  };

// route the request to the handler specified in the router
chosenHandler(data, function(statusCode, payload){
  //use the status code called back by the handler, or default to 200
statuseCode = typeof(statusCode) == "number" ? statusCode: 200;
  //use the payload called back by the handler, or default to {}
  payload = typeof(payload) == "object" ? payload : {};

  //Convert the payload to string_decoder
  let payloadString = JSON.stringify(payload);

  //Return the response
  res.setHeader("Content-Type","application/json");
  res.writeHead(statusCode);
  res.end(payloadString);

  console.log("Returning this response: " , statusCode,payloadString);

});


  });

};

// Define a request router
let router = {
  users : handlers.users,
  ping : handlers.ping,
  hello : handlers.hello,
  tokens : handlers.tokens,
  checks : handlers.checks
};
