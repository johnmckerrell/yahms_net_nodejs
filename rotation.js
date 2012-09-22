var http = require("http");
var url = require("url");

function updateRotation(mac,currentRotation,response,connections)
{    
    var options = {
        host: 'mapme.at',
        port: 80,
        path: '/api/wheredial.csv?mac='+mac,
        method: 'GET'
    };

    var req = http.get(options, function(res) {
        var pageData = "";
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            pageData += chunk;
        });

        res.on('end', function(){
            console.log("Data from the server: "+pageData);
            var rotationToDo = pageData-currentRotation;
            if(rotationToDo == 0)
            {
                console.log("No need for rotation, WhereDial will wait");
                var connection = new Array();
                connections[mac.toString()]=connection;
                connection['response'] = response;
                connection['currentRotation'] = currentRotation;

                console.log("Number of WhereDials waiting:"+ Object.keys(connections).length);
            }else
            {
                response.writeHead(200, {"Content-Type": "text/plain"});
                response.write(rotationToDo.toString());
                response.end();
            }
        });
      });
}


function getCurrentPosition(mac)
{
	//connects to map.me.at
    // mapme.at/api/wheredial.csv?mac=value

    var options = {
        host: url,
        port: 80,
        path: 'mapme.at/api/wheredial.csv?mac='+mac,
        method: 'POST'
    };

    http.request(options, function(res) {
        console.log('STATUS: ' + res.statusCode);
        console.log('HEADERS: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('BODY: ' + chunk);
        });
    }).end();
	return 210;
}

function updatePosition(mac,position,response,connections)
{
    //if there is an active connection for the mac address
    if(typeof(connections[mac]) == 'object')
    {
        var rotationToDo = position-connections[mac]['currentRotation'];
        //response for the map.me.at API
        response.writeHead(200, {"Content-Type": "text/plain"});
        response.write("Done, WhereDial should now rotate to:" +position);
        response.end();

        //closes the original request from the WhereDial
        response = connections[mac]['response'];
        response.write(rotationToDo.toString());
        response.end();
        //to clean the memory and update the number of active connections
        delete connections[mac];
    }else
    {
        console.log("Trying to update the position of ["+mac+"] to "+position+ " but WhereDial is not connected");
        response.writeHead(200, {"Content-Type": "text/plain"});
        response.write("No WhereDial with this mac address connected");
        response.end();
    }
}

exports.updateRotation = updateRotation;
exports.updatePosition = updatePosition;