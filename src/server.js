let externalIp = require('public-ip');
let internalIp = require('internal-ip');
let EventEmitter = require('events');
let DataBase = require('./db');
let Router = require('./communication/router');
var http = require('http');
var dgram = require('dgram');



//This is the contructor
var P5Server = function(opts) {
  this.db = new DataBase();
  let router = new Router(this.db);

  if(opts.root) {
    this.waitingConnection = false;
  } else {
    this.waitingConnection = true;
  }

  this.db.setSendPort(opts.sendPort);
  this.db.setReceivePort(opts.receivePort);

	//Make this accessible to the user
	this.key = opts.keys.publicKey;

	//Store this on the db
	this.db.setTopologyServers(opts.topologyServers);
	this.db.setNetworkId(opts.networkId);
	this.db.setKeys(opts.keys);
};

//P5Server.prototype = new EventEmitter();

P5Server.prototype.start = function() {
	self = this;
	//Get the public and local ip's before starting the listener
	externalIp.v4().then(publicIp => {
	    internalIp.v4().then(localIp => {
        let listener = dgram.createSocket('udp4');
	      console.log("Your public IP address is '" + publicIp + "'");
	      console.log("Your local IP address is '" + localIp + "'");
	      console.log("Make sure to route UDP port '" + this.db.getReceivePort() + "' to your local IP address");
        console.log("\n\n");
        
        //self.db.setAddress(publicIp);
        self.db.setAddress(localIp);
	  
	      listener.on("listening", function() {
	        let address = listener.address();
	        console.log('\tUDP Server listening on ' + address.address + ":" + address.port + "\n\n");
	      });
	  
	  	  //Incoming message from another node 
	      listener.on("message", function(message, remote) {
          if(waitingConnection) {
            let invite = JSON.parse(message.toString());
            console.log("GOT INVITE");
            console.log(invite);
            let parent = invite.parentInfo;
            self.db.setParent(parent.address, parent.sendPort, parent.receivePort, parent.channel);
            self.db.setCommChannel(invite.commChannel);
            return;
          }
          //Send it to router (router will forward if necessary)
	        router.parseMsg(message, remote).then(msg => {
	        	//Emit newMsg event for the user
	        	if(msg) self.emit('newMsg', data);
	        });
	      });
	  
	      listener.on("error", function(err) {
	        console.error("Socket server error: ", err.message, "\nerr:", err);
	      });

	      //Start Listener
	      listener.bind(self.db.getReceivePort(), localIp);
	    });
	});

	//User Send function
	this.send = function(message, receiverKey, receiverCh) {
		router.sendMsg(message, receiverKey, receiverCh);
	};

	//Stop this server
	this.stop = function() {
	  listener.close();
  }
}

// Export the server
module.exports = P5Server;