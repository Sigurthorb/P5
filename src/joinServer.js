const express = require('express');
const bodyParser = require('body-parser');
const EventEmitter = require('events');
const https = require("https");
const util = require('util');
const keyGenerator = require("./crypto/keyGenerator");

//This is the contructor
function JoinServer(opts) {
	let listener;
	let self = this;
 	EventEmitter.call(this);

   	let topologyServers = opts.topologyServers || null;
  	let networkId = opts.networkId || null;
  
  	keyGenerator.generateServerCertificates().then((keys) => {

	    let server = express();
	    server.use(bodyParser.json()); // support json encoded bodies
	    server.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
	  
	    //Sent from Candidate Node to Entry Point Node
		server.get('/getTopologyServers', function(req, res){
			if(topologyServers && networkId){
				let data = {
					servers:topologyServers,
					netId:networkId
				};

				res.json(data);
			} else {
				res.send("NO TOPOLOGY SERVERS FOUND");
			}
		});
	  
	    //Sent from Candidate Node to Entry Point Node
	    server.post('/requestToJoin', function(req, res){
	      let data = {
	        channel: req.body.channel,
	        address: req.connection.remoteAddress,
	        port: req.body.port
	      };
	      console.log("address: ", req.connection.remoteAddress);
	      console.log("ch: ", req.body.channel);
	      //Broadcast join Request through P5
	      self.emit('joinRequest', data);
	      res.send("REQUEST BROADCASTED TO P5 NETWORK");		
	    });
	  
	    //Sent from Parent Node to Candidate Node
	    server.post('/parentingRequest', function(req, res){
	      //This is an encoded msg that contains - position, send and receive ports from the parent
	      let params = req.body;
	      params.address = req.connection.remoteAddress;
	  
	      //Emit server creation request
	      self.emit('parentRequest', params);
	      
	      let data = {
	        sendPort:opts.sendPort,
	        receivePort:opts.receivePort
	      };
	  
	      //Send send/receive ports
	      res.json(data);
	    });
	  
	    listener = https.createServer({key: keys.serviceKey, cert: keys.certificate}, server);
	    
	    listener.listen(opts.joinPort, "0.0.0.0");
	    
	    console.log('Listening at https://localhost:' + opts.joinPort);

	    self.setTopologyServers = function(servers) {
			topologyServers = servers;
		};

		self.setNetworkId = function(id) {
			networkId = id;
		};
	  
	    self.close = function(){
	      console.log("Closing connection...");
	      if(listener) listener.close();
	    };
	});

};

util.inherits(JoinServer, EventEmitter);

// Export the server
module.exports = JoinServer;