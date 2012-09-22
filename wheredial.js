var http = require("http");
var url = require("url");
var rot = require("./rotation.js");

function start() 
{
  /*array to store all the active connections which are waiting (rotation to do != 0)
  connections
    └connection['mac']
      └['currentRotation']  :current rotation of the WhereDial waiting 
      └['response']         :response object used to send the data

  */
  var connections = new Array();
  
  function onRequest(request, response)
  {
    var postData = "";
    var pathname = url.parse(request.url).pathname;

    request.setEncoding("utf8");

    request.addListener("data", function(postDataChunk) {
      postData += postDataChunk;
    });

    request.addListener("end", function() {
      if(postData == '')
      {
        response.writeHead(200, {"Content-Type": "text/plain"});
        response.write("No data sent");
        response.end();

        console.log("Number of WhereDials connected and waiting: "+Object.keys(connections).length)
      }else
      {
        console.log("--------------"+pathname);
        if(pathname=="/getRotation")
        {
          var mac = postData.split('=')[1].split('&')[0];
          var rotation = postData.split('=')[2];
          
          console.log("\n~WhereDial connected~");
          console.log("MAC-address:"+mac);
          console.log("Current rotation:"+rotation);

          rot.updateRotation(mac,rotation,response,connections);
        }else if(pathname = "/update")
        {
          var mac = postData.split('=')[1].split('&')[0];
          var position = postData.split('=')[2];
          console.log("Position for mac address "+mac+" changed to "+ position)

          rot.updatePosition(mac,position,response,connections);
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

  http.createServer(onRequest).listen(8888);
  console.log("Server has started."); 
}

start();
