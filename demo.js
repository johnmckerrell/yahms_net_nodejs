var http = require("http");
var url = require("url");
var globalConnections = null;

var positions = [
    {
        position: 0,
        placeHash: 'a'
    },
    {
        position: 30,
        placeHash: 'a'
    },
    {
        position: 60,
        placeHash: 'a'
    },
    {
        position: 90,
        placeHash: 'a'
    },
    {
        position: 120,
        placeHash: 'a'
    },
    {
        position: 150,
        placeHash: 'a'
    },
    {
        position: 180,
        placeHash: 'a'
    },
    {
        position: 210,
        placeHash: 'a'
    },
    {
        position: 240,
        placeHash: 'a'
    },
    {
        position: 270,
        placeHash: 'a'
    },
    {
        position: 300,
        placeHash: 'a'
    },
    {
        position: 330,
        placeHash: 'a'
    },
    {
        position: 330,
        placeHash: 'a'
    },
    {
        position: 330,
        placeHash: 'a'
    },
    {
        position: 330,
        placeHash: 'a'
    },
    {
        position: 330,
        placeHash: ''
    },
    {
        position: 330,
        placeHash: ''
    },
    {
        position: 330,
        placeHash: ''
    },
    {
        position: 330,
        placeHash: ''
    },
    {
        position: 330,
        placeHash: ''
    },
    {
        position: 330,
        placeHash: ''
    },
    {
        position: 330,
        placeHash: 'a'
    },
];
var lastPosition = null;

function checkPosition(mac,currentPosition,currentPlaceHash,jsonp,response,connections)
{    
    if (!globalConnections) {
        globalConnections = connections;
    }
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
    connection['jsonp'] = jsonp && jsonp == 'yes';

    // then straight away check the current position
    requestCurrentPosition(mac,connections);
}


function requestCurrentPosition(mac,connections)
{
    if (lastPosition) {
        updatePosition(mac,lastPosition.position,lastPosition.placeHash,connections);
    }
}

function updatePosition(mac,position,placeHash,connections)
{
    //if there is an active connection for the mac address
    var macConnections = connections[mac];
    if(macConnections)
    {
        var updatedConnections = [];
        for (var i in macConnections) {
            var wheredialConnection = macConnections[i];
            if (wheredialConnection['currentPosition'] != position || wheredialConnection['currentPlaceHash'] != placeHash) {
                console.log("Updating one WhereDial ["+mac+"]");
                //closes the original request from the WhereDial
                response = wheredialConnection['response'];
                var responseBody = position.toString()+','+placeHash.toString();
                if (wheredialConnection['jsonp']) {
                    responseBody = 'wheredialPositionUpdate('+JSON.stringify(position)+','+JSON.stringify(placeHash)+')';
                } else {
                    responseBody = position.toString()+','+placeHash.toString();
                }
                response.setHeader('Content-Length',responseBody.length.toString());
                response.write(responseBody);
                response.end();
                //to clean the memory and update the number of active connections
            } else {
            // Otherwise this is the location we had already, keep connection for later
                updatedConnections.push(wheredialConnection);
                console.log("Keeping one WhereDial ["+mac+"] ("+wheredialConnection['currentPosition']+','+wheredialConnection['currentPlaceHash']+')');
            }
        }
        connections[mac] = updatedConnections;
    }
}

function selectRandomPosition() {
    var position = null;
    // Make sure we always have a unique position
    while (position == null || (lastPosition && lastPosition.position == position.position && lastPosition.placeHash == position.placeHash)) {
        var index = Math.floor(Math.random() * positions.length);
        position = positions[index];
    }
    lastPosition = position;

    if (globalConnections) {
        requestCurrentPosition('demo',globalConnections);
    }
}

selectRandomPosition();
setInterval(selectRandomPosition,30000);

exports.checkPosition = checkPosition;
exports.updatePosition = updatePosition;
exports.requestCurrentPosition = requestCurrentPosition;
