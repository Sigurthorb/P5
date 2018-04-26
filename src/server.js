const externalIp = require('public-ip');
const internalIp = require('internal-ip');
const EventEmitter = require('events');
const joinServer = require("./joinServer");
const DataBase = require('./db');
const Router = require('./communication/router');
const util = require('util');
const http = require('http');
const dgram = require('dgram');


//This is the contructor
function P5Server(opts) {
  let self = this;
	let db = new DataBase();

  db.setSendPort(opts.sendPort);
  db.setReceivePort(opts.receivePort);
  db.setJoinPort(opts.joinPort);

	//Store this on the db
	db.setTopologyServers(opts.topologyServers);
	db.setNetworkId(opts.networkId);
	db.setKeys(opts.keys);
  db.setPosition(opts.position);
	console.log("Position: ", opts.position);
	
	let routerEmitter = new EventEmitter();
  let router = new Router(db, routerEmitter);
  EventEmitter.call(this);

  //Add parent if necessary
  if(opts.parent) {
		db.setParent(opts.parent.address, opts.parent.sendPort, opts.parent.receivePort, opts.parent.position);
	} else {
		db.setAsRoot();
	}

  //Make this accessible to the user
  this.key = opts.keys.publicKey;
  this.channel = opts.channel;

	this.start = function() {
		router.startListen();
	}

	this.stop = function() {
		router.stopListen();
	}

	this.sendSynMsg = function(buffer) {
  	// validation
  	try {
    		router.sendSynMsg(buffer); // TAKES A BUFFER
  	} catch(err) {

  	}
	};

  this.sendDataMsg = function(buffer) {
    // validation
    try {
        router.sendSynMsg(buffer); // TAKES A BUFFER
    } catch(err) {

    }
  };

  //Forward event to the user
  routerEmitter.on("message", data => {
    self.emit("message", data);
  });

	//Start joinServer -- Will listen for candidate nodes
	let jServer = new joinServer({
		topologyServers: opts.topologyServers,
		networkId: opts.networkId,
		joinPort: opts.joinPort
	});

	jServer.on("joinRequest", data => {
    console.log(data);
		router.sendJoinMsg(data.address, data.port, data.channel);	
	});

};

//Make P5 an emitter
util.inherits(P5Server, EventEmitter);

// Export the server class
module.exports = P5Server;