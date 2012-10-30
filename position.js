var http = require("http");
var url = require("url");

function checkPosition(mac,currentPosition,currentPlaceHash,response,connections)
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
            var result = pageData.split(',');
            var livePosition = result[0];
            var livePlaceHash = result[1];
            if(livePosition == currentPosition && livePlaceHash == currentPlaceHash)
            {
                console.log("No need for rotation, WhereDial will wait");
                var connection = {};
                var macConnections = connections[mac.toString()];
                if (!macConnections) {
                    console.log("Setting mac connections");
                    macConnections = [];
                    connections[mac.toString()] = macConnections;
                }
                macConnections.push(connection);
                connection['response'] = response;
                connection['currentPosition'] = currentPosition;
                connection['currentPlaceHash'] = currentPlaceHash;

                console.log("Number of WhereDials waiting:"+ Object.keys(connections).length);
            }else
            {
                response.writeHead(200, {"Content-Type": "text/plain"});
                response.write(pageData);
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

function updatePosition(mac,position,placeHash,response,connections)
{
    //if there is an active connection for the mac address
    var macConnections = connections[mac];
    if(macConnections)
    {
        //response for the map.me.at API
        response.writeHead(200, {"Content-Type": "text/plain"});
        response.write("Done, WhereDial should now rotate to:" +position);
        response.end();

        var updatedConnections = [];
        for (var i in macConnections) {
            var wheredialConnection = macConnections[i];
            if (wheredialConnection['currentPosition'] != position || wheredialConnection['currentPlaceHash'] != placeHash) {
                //closes the original request from the WhereDial
                response = wheredialConnection['response'];
                response.write(position.toString()+','+placeHash.toString());
                response.end();
                //to clean the memory and update the number of active connections
            } else {
            // Otherwise this is the location we had already, keep connection for later
                updatedConnections.push(wheredialConnection);
            }
        }
        connections[mac] = updatedConnections;
    }else
    {
        console.log("Trying to update the position of ["+mac+"] to "+position+ " but WhereDial is not connected");
        response.writeHead(200, {"Content-Type": "text/plain"});
        response.write("No WhereDial with this mac address connected");
        response.end();
    }
}

exports.checkPosition = checkPosition;
exports.updatePosition = updatePosition;
