var http = require("http");
var url = require("url");
var qs = require('querystring');
var CONFIG = require('config').Config;
var api = require("./api.js");

function start() 
{
  api.setConfig(CONFIG);

  /*array to store all the active connections which are waiting (position to do != 0)
  connections
    └connection['mac']
      └['currentRotation']  :current position of the WhereDial waiting 
      └['currentPlaceHash'] :current place hash of the WhereDial waiting 
      └['response']         :response object used to send the data

  */
  var connections = {};

  function onRequest(request, response)
  {
    var postData = "";
    var parsedURL = url.parse(request.url,true);

    request.setEncoding("utf8");
    request.socket.setKeepAlive(true,10);
    request.socket.setTimeout(0);
    response.socket.setKeepAlive(true,10);
    response.socket.setTimeout(0);

    request.addListener("data", function(postDataChunk) {
      postData += postDataChunk;
      if (postData.length > 1e6) {
        // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
        request.connection.destroy();
      }
    });

    request.addListener("close", function() {
        for (var mac in connections) {
            var macConnections = connections[mac];
            var updatedConnections = [];
            for (var i = 0, l = macConnections.length; i < l; ++i) {
                if (macConnections[i]['response'] == response) {
                    console.log("Connection from "+mac+" closed. "+(new Date()));
                } else {
                    updatedConnections.push(macConnections[i]);
                }
            }
            connections[mac] = updatedConnections;
        }
    });
    request.addListener("end", function() {
      {
        var pathParts = parsedURL.pathname.split('/');
        console.log("--------------"+parsedURL.pathname);
        console.log(pathParts);
        if(pathParts[1]=="c")
        {
          var mac = pathParts[2]
          if (mac) {
            mac = mac.toLowerCase().replace(/[^a-f0-9]/, '');
          }
          var apiVersion = pathParts[3];
          var lastUpdate = pathParts[4];
          
          console.log("\n~YAHMS Base Station connected~");
          console.log(new Date());
          console.log("MAC-address:"+mac);
          console.log("API Version:"+apiVersion);
          console.log("Last Update:"+lastUpdate);

          if (mac) {
              api.checkLastUpdate(mac,lastUpdate,apiVersion,response,connections);
          } else {
              console.log("400 ERROR");
              response.writeHead(400, {"Content-Type": "text/plain"});
              response.write("400 No MAC specified");
              response.end();
          }
        }else if(pathParts[1] == "u")
        {
          var mac = pathParts[2];
          if (mac) {
            mac = mac.toLowerCase().replace(/[^a-f0-9]/, '');
          }
          console.log("Position for mac address changed");

          api.requestCurrentConfig(1,0,mac,connections);

          response.writeHead(204);
          response.end();
        }else
        {
          console.log("404 ERROR");
          response.writeHead(404, {"Content-Type": "text/plain"});
          response.write("404 Not found");
          response.end();
        }
      }
    });

  }

  http.createServer(onRequest).listen(CONFIG.listenPort,CONFIG.listenHost);
  console.log("Server has started "+CONFIG.listenHost+":"+CONFIG.listenPort); 

  process.on( 'SIGUSR1', function() {
    console.log("YAHMS.js Status:");
    console.log("================");
    var anything = false;
    for (var mac in connections) {
      var macConnections = connections[mac];
      if (macConnections && macConnections.length) {
          anything = true;
        console.log("  "+mac+": "+macConnections.length+" connection"+(macConnections.length==1?'':'s'));
      }
    }
    if (!anything) {
      console.log("  No connections");
    }
    console.log("");
  });
}

start();
