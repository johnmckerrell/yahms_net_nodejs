var http = require("http");
var url = require("url");
var CONFIG = null;

function setConfig(conf) {
    CONFIG = conf;
}

function checkPosition(mac,currentPosition,currentPlaceHash,response,connections)
{    
    // Add this connection to the array of connections
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

    // then straight away check the current position
    requestCurrentPosition(mac,connections);
}


function requestCurrentPosition(mac,connections)
{
	//connects to map.me.at
    // mapme.at/api/wheredial.csv?mac=value


    var options = {
        host: CONFIG.mapme_at.host,
        port: CONFIG.mapme_at.port,
        path: '/api/wheredial.csv?mac='+mac,
        method: 'POST'
    };
    
    var req = http.get(options, function(res) {
        if (res.statusCode != 200) {
            console.log('Request gave bad response: '+res.statusCode);
            req.end();
            return;
        }
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
            updatePosition(mac,livePosition,livePlaceHash,null,connections);
        });
      });

}

function updatePosition(mac,position,placeHash,response,connections)
{
    //if there is an active connection for the mac address
    var macConnections = connections[mac];
    if(macConnections)
    {
        //response for the map.me.at API
        if (response) {
            response.writeHead(200, {"Content-Type": "text/plain"});
            response.write("Done, WhereDial should now rotate to:" +position);
            response.end();
        }

        var updatedConnections = [];
        for (var i in macConnections) {
            var wheredialConnection = macConnections[i];
            if (wheredialConnection['currentPosition'] != position || wheredialConnection['currentPlaceHash'] != placeHash) {
                //closes the original request from the WhereDial
                response = wheredialConnection['response'];
                var responseBody = position.toString()+','+placeHash.toString();
                response.setHeader('Content-Length',responseBody.length.toString());
                response.write(responseBody);
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
        if (response) {
            response.writeHead(200, {"Content-Type": "text/plain"});
            response.write("No WhereDial with this mac address connected");
            response.end();
        }
    }
}

exports.setConfig = setConfig;
exports.checkPosition = checkPosition;
exports.updatePosition = updatePosition;
exports.requestCurrentPosition = requestCurrentPosition;
