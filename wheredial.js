var http = require("http");
var url = require("url");
var qs = require('querystring');
var CONFIG = require('config').Config;
var rot = require("./position.js");

function start() 
{
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

    request.addListener("data", function(postDataChunk) {
      postData += postDataChunk;
      if (postData.length > 1e6) {
        // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
        request.connection.destroy();
      }
    });

    request.addListener("end", function() {
      {
        var POST = qs.parse(postData);
        console.log("--------------"+parsedURL.pathname);
        if(parsedURL.pathname=="/wheredial.csv")
        {
          var mac = parsedURL.query.mac;
          var position = parsedURL.query.position;
          var placeHash = parsedURL.query.placeHash
          
          console.log("\n~WhereDial connected~");
          console.log("MAC-address:"+mac);
          console.log("Current position:"+position);
          console.log("Current place hash:"+placeHash);

          rot.checkPosition(mac,position,placeHash,response,connections);
        }else if(parsedURL.pathname == "/update")
        {
          var mac = POST.mac;
          var position = POST.position;
          var placeHash = POST.placeHash
          console.log("Position for mac address "+mac+" changed to "+ position + " with hash "+placeHash);

          rot.updatePosition(mac,position,placeHash,response,connections);
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

  http.createServer(onRequest).listen(CONFIG.port,CONFIG.host);
  console.log("Server has started "+CONFIG.host+":"+CONFIG.port); 
}

start();
