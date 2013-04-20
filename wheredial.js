var http = require("http");
var url = require("url");
var qs = require('querystring');
var CONFIG = require('config').Config;
var rot = require("./position.js");
var demo = require("./demo.js");
var beanstalk = require('beanstalk_client').Client;

function start() 
{
  rot.setConfig(CONFIG);

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
        var POST = qs.parse(postData);
        console.log("--------------"+parsedURL.pathname);
        if(parsedURL.pathname=="/wheredial.csv")
        {
          var mac = parsedURL.query.mac
          if (mac) {
            mac = mac.toLowerCase().replace(/[^a-f0-9]/, '');
          }
          var position = parsedURL.query.position;
          var placeHash = parsedURL.query.placeHash
          
          console.log("\n~WhereDial connected~");
          console.log(new Date());
          console.log("MAC-address:"+mac);
          console.log("Current position:"+position);
          console.log("Current place hash:"+placeHash);

          if (mac) {
              rot.checkPosition(mac,position,placeHash,response,connections);
          } else {
              console.log("400 ERROR");
              response.writeHead(400, {"Content-Type": "text/plain"});
              response.write("400 No MAC specified");
              response.end();
          }
        }else if(parsedURL.pathname == "/demo.csv")
        {
          var position = parsedURL.query.position;
          var placeHash = parsedURL.query.placeHash;
          var jsonp = parsedURL.query.jsonp;
          
          console.log("\n~Demo WhereDial connected~");
          console.log(new Date());
          console.log("MAC-address:"+mac);
          console.log("Current position:"+position);
          console.log("Current place hash:"+placeHash);
          demo.checkPosition('demo',position,placeHash,jsonp,response,connections);
        }else if(parsedURL.pathname == "/update")
        {
          var mac = POST.mac;
          if (mac) {
            mac = mac.toLowerCase().replace(/[^a-f0-9]/, '');
          }
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

  http.createServer(onRequest).listen(CONFIG.listenPort,CONFIG.listenHost);
  console.log("Server has started "+CONFIG.listenHost+":"+CONFIG.listenPort); 

  beanstalk.connect(CONFIG.beanstalk.host+':'+CONFIG.beanstalk.port, function(err, conn) {
    conn.watch(CONFIG.beanstalk.tube,function() {
      var reserve = function() {
        conn.reserve(function(err, job_id, job_json) {
          console.log('got job: ' + job_id);
          console.log('got job data: ' + job_json);
          var mac = job_json.toLowerCase().replace(/[^a-f0-9]/, '');
          var macConnections = connections[job_json];
          if (macConnections && macConnections.length) {
              rot.requestCurrentPosition(job_json,connections);
          }
          conn.destroy(job_id, function(err) {
            console.log('destroyed job');
            reserve();
          });
        });
      }
 
      reserve();
    });

  });
  console.log("Beanstalk listening for "+CONFIG.beanstalk.tube+" from "+CONFIG.beanstalk.host+":"+CONFIG.beanstalk.port);

  process.on( 'SIGUSR1', function() {
    console.log("WhereDial.js Status:");
    console.log("====================");
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
