var topology = require("./src/topology");
var db = require("./src/db");
var P5Server = require("./src/server");
var keyGenerator = require("./src/crypto/keyGenerator");

//Creates a New P5 network
//topologyServers: Array of IPs or domains of topology server addresses
//Returns: A promise with a server object
exports.create = function(topologyServers){
	//Create Topology Network
	return topology.createNetwork(topologyServers).then( netId => {
		Generate Keys
		keyGenerator.generateKeyPair(keys => {
			var server = new P5Server({
				networkId:netId, 
				keys:keys,
				channel:"",
				topologyServers:topologyServers,
				ports:{listener:33444, sender:33555} 
			});

			//Set server to router
			return server;
		});

	});
};

//Joins an Existing P5 Network
//srcNodeIp: The IP of a Node on the Network
//Returns: A newly generated public key for the root node
exports.join = function(srcNodeIp, minNodes, maxNodes){
	//Request channel topology list [{ch:n nodes}] from srcNode

	//Select Channel from List

	//Request to Join Channel

	//Listen for response from parent. If response times out, try again a few times.

	//When a response is received, send back an ACK and start node's server (listen for any messages/join requests from parent)

	//Finally send topology server a request to add ip to channel

};

//Leaves the P5 Network
//Returns: A promise with a value of true or false
exports.leave = function(){
	//Send message to all neighbor nodes telling them you're leaving (parent will remove you from the list). Children will have to leave too and rejoin

	//Send Request to topology server to remove ip from channels

};