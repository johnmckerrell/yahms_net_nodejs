var http = require("http");
var url = require("url");
var CONFIG = null;

function setConfig(conf) {
    CONFIG = conf;
}

function checkLastUpdate(mac,lastUpdate,apiVersion,response,connections)
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
    connection['lastUpdate'] = lastUpdate;
    connection['apiVersion'] = apiVersion;

    // then straight away check the current position
    requestCurrentConfig(apiVersion,lastUpdate,mac,connections);
}


function requestCurrentConfig(apiVersion,lastUpdate,mac,connections)
{
	//connects to yahms.net
    // yahms.net/api/c/mac/api/updatetime


    var options = {
        host: CONFIG.yahms_net.host,
        port: CONFIG.yahms_net.port,
        path: '/api/c/'+mac+'/'+apiVersion+'/'+lastUpdate,
        method: 'GET'
    };
    
    var req = http.get(options, function(res) {
        if (res.statusCode == 304) {
            console.log('Config has not changed.');
            req.end();
            return;
        } else if (res.statusCode != 200) {
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
            updateConfig(mac,pageData,connections);
        });
      });

}

function updateConfig(mac,apiResponseString,connections)
{
    //if there is an active connection for the mac address
    var macConnections = connections[mac];
    if(macConnections)
    {
        var updatedConnections = [];
        for (var i in macConnections) {
            var yahmsConnection = macConnections[i];
            console.log("Updating one YAHMS base station ["+mac+"]");
            //closes the original request from the YAHMS base station
            response = yahmsConnection['response'];
            var responseBody = apiResponseString;
            response.setHeader('Content-Length',responseBody.length.toString());
            response.write(responseBody);
            response.end();
            //to clean the memory and update the number of active connections
        }
        connections[mac] = updatedConnections;
    }else
    {
        console.log("Trying to update the position of ["+mac+"] but YAHMS base station is not connected");
    }
}

exports.setConfig = setConfig;
exports.checkLastUpdate = checkLastUpdate;
exports.updateConfig = updateConfig;
exports.requestCurrentConfig = requestCurrentConfig;
