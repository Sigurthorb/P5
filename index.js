const topology = require("./src/topology");
const db = require("./src/db");
const P5Server = require("./src/server");
const JoinServer = require("./src/joinServer"); //Stateful  - Event Based
const JoinClient = require("./src/joinClient"); //Stateless - Promise Based
const keyGenerator = require("./src/crypto/keyGenerator");
const util = require("./src/util");

//Creates a New P5 network
//topologyServers: Array of IPs or domains of topology server addresses
//Returns: A promise with a server object
exports.create = function(topologyServers, opts = {}){
	console.log("Creating topology network...");
	//Create Topology Network
	return topology.createNetwork(topologyServers).then( netId => {
		console.log("Topology network created. ID: ", netId);
		console.log("Generating Keys...");
		//Generate Keys
		return keyGenerator.generateKeyPair().then(keys => {
			console.log("Keys Generated.");
			console.log("Instantiating Server...");
			let server = new P5Server({
				networkId:netId, 
				keys:keys,
				channel:"",
				position:"",
				topologyServers:topologyServers,
				sendPort:opts.sendPort || 33444,
				receivePort:opts.receivePort || 33555,
				joinPort:opts.joinPort || 33666,
			});
			console.log("Server Instantiated.");
			//Set server to router
			return server;
		});

	});
};

//Joins an Existing P5 Network
//srcNodeIp: The IP of a Node on the Network
//srcNodePort: The Join Port of a Node on the Network
//Returns: A newly generated public key for the root node
exports.join = function(srcNodeIp, srcNodePort, minNodes, maxNodes, opts){
	let keys, netId, topologyServers, channel, jServer;
	let jServerParams = {     
        sendPort:opts.sendPort || 33444,
        receivePort:opts.receivePort || 33555,
        joinPort:opts.joinPort || 33666 
    }; 

    //First, create the join server, so it can start generating the certs
    return new JoinServer(jServerParams).then(server => {
        jServer = server;
        //Now, start the join server 
        return jServer.start();

    }).then(() => {
	    //Generate public/private keys
        return keyGenerator.generateKeyPair();

	}).then(k => {
		keys = k;
		console.log("Keys Generated.");
		console.log("Requesting Topology Servers...");
		//Get Topology Servers
		return JoinClient.getTopologyServers(srcNodeIp, srcNodePort);

	}).then(data => {
		netId = data.netId;
		topologyServers = data.servers;
		console.log("Got Topology Servers. Servers. Net ID: ", netId);
		console.log("Requesting Topology...");
		//Get Topology
		return topology.getTopology(data.servers, data.netId);

	}).then(topology => {
		console.log("Got Topology.");
		console.log(topology);

		//Decide on a channel
		let binaryKey = keyGenerator.convertKeyToBinary(keys.publicKey);
		channel = util.pickChannel(topology, binaryKey, minNodes, maxNodes);
		console.log("Picked Channel: ", channel);
		console.log("Requesting To Join...");	
		//Request to join
		return JoinClient.joinNetwork(srcNodeIp, srcNodePort, channel, opts.joinPort);

	}).then(resp => {
        console.log("Listening for Parent Request...");
		//New promise returns a P5Server
		return new Promise(function(resolve, reject) {  
			//Now listen for a parent request...
			let connected = false;
			setTimeout(function() {
				if(!connected) {
          console.log("ERROR: Did not receive a invite after 20 seconds");
          jServer.close().then(function() {
            reject("ERROR: Did not receive a invite after 20 seconds");
          });
				}
			}, 20000);
			jServer.on("parentRequest", parent => {
				connected = true;
				console.log("Got Parent Request.");
				let position = parent.position;
				parent.position = parent.position.slice(0, parent.position.length-1);

				console.log("Instantiating Server...");
				let server = new P5Server({
					networkId:netId, 
					keys:keys,
					channel:channel,
					position:position,
					topologyServers:topologyServers,
					sendPort:opts.sendPort || 33444,
					receivePort:opts.receivePort || 33555,
					joinPort:opts.joinPort || 33666,
					parent:parent,
					joinServer:jServer
				});
				console.log("Server Instantiated.");

				//Add topology information
				topology.joinNetwork(topologyServers, netId, position);


				resolve(server);
			});
		})
	});
};