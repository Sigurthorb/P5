let externalIp = require('public-ip');
let internalIp = require('internal-ip');
let events = require('events');
let DataBase = require('./db');


exports.getKey = function(){
	
};

exports.start = function(){
	

};

exports.stop = function(){
	
};


export.server = function(){


	this.getKey 
} 

var util = require('util');
var http = require('http');
var dgram = require('dgram');



//This is the contructor
var P5Server = function(opts) {
	var listener = dgram.createSocket('udp4');
	var db = new DataBase();

	//Make this accessible to the user
	this.key = opts.keys.publicKey;

	//Store this on the db
	db.setTopologyServers(opts.topologyServers);
	db.setNetworkId(opts.networkId);
	db.setKeys(opts.keys);
	db.setPorts(opts.ports);
};

P5Server.prototype = new events.EventEmitter;

P5Server.prototype.start = function() {
	self = this;

	//Get the public and local ip's before starting the listener
	externalIp.v4().then(publicIp => {
	    internalIp.v4().then(localIp => {
	      console.log("Your public IP address is '" + publicIp + "'");
	      console.log("Your local IP address is '" + localIp + "'");
	      console.log("Make sure to route UDP port '" + this.listenerPort + "' to your local IP address");
	      console.log("\n\n");
	  
	      listener.on("listening", function() {
	        self.address = listener.address();
	        console.log('\tUDP Server listening on ' + address.address + ":" + address.port + "\n\n");
	      });
	  
	  	  //Incoming message from another node 
	      listener.on("message", function(message, remote) {
	        //Send it to router (router will forward if necessary)
	        router.parseMessage(message, remote, db).then(msg => {
	        	if(msg) self.emit('newMsg', data);
	        });
	      });
	  
	      listener.on("error", function(err) {
	        console.error("Socket server error: ", err.message, "\nerr:", err);
	      });

	      //Start Listener
	      listener.bind(port, localIp);
	    });
	});


	//User Send function
	this.send = function(message, receiverKey, receiverCh) {
		router.sendMsg(message, receiverKey, receiverCh, db);
	};

	//Stop this server
	this.stop = function() {
	  listener.close();
	}

// Export the server
module.exports = P5Server;