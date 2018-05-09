const externalIp = require('public-ip');
const internalIp = require('internal-ip');
const EventEmitter = require('events');
const joinServer = require("./joinServer");
const DataBase = require('./db');
const Router = require('./communication/router');
const util = require('util');
const http = require('http');
const dgram = require('dgram');
const keyGenerator = require("./crypto/keyGenerator");


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
	db.setChannelAsymmetricKeys(opts.keys);
  db.setPosition(opts.position);
	console.log("Position: ", opts.position);
	
	let routerEmitter = new EventEmitter();
  let router = new Router(db, routerEmitter);
  EventEmitter.call(this);

  //Add parent if necessary
  if(opts.parent) {
		db.setParent(opts.parent.address, opts.parent.sendPort, opts.parent.receivePort, opts.parent.position, opts.parent.symmetricKey);
	} else {
		db.setAsRoot();
	}

  //Make this accessible to the user
  this.key = opts.keys.publicKey;
  this.channel = opts.channel;

	this.start = function() {
		router.startListen();
	};

	this.stop = function() {
    router.leaveNetwork();
    router.stopListen();
    topology.leaveNetwork(db.getTopologyServers(), db.getNetworkId(), db.getPosition());
  };
  
  this.addSymmetricKey = function(key) {
    db.addSymmetricKey(key);
  };

    //this.removeSymmetricKey = db.removeSymmetricKey;

  // this be promise for error reporting?
	this.sendSynMsg = function(publicKey, data, opts = {}) {
    // opts values are optional client side, needs to be defined before entering router.
    // {channel: string, symmetricKey: string}
    // symmetricKey validation length and type
    // data buffer max length to be defined
    let channel = opts.channel || "";
    let symmetricKey = opts.symmetricKey || keyGenerator.generateSymmetricKey(); 

    if(!opts.symmetricKey) {
      symmetricKey = keyGenerator.generateSymmetricKey();
      
    } else {
      symmetricKey = opts.symmetricKey;
    }

    // validation - TO DO Check the length of symmetric key
    if(db.getSymmetricKeys().indexOf(symmetricKey) === -1){
      db.addSymmetricKey(symmetricKey);
    }     
    router.sendSynMsg(publicKey, channel, symmetricKey, data);

    return symmetricKey;
	};

  // this be promise for error reporting?
  this.sendDataMsg = function(symmetricKey, data, channel = "") {
    //validation
    router.sendDataMsg(symmetricKey, data, channel);
  };

  //Forward event to the user
  routerEmitter.on("synMessage", data => {
    /*
    data: {
      symmetricKey: string,
      channel: string,
      data: buffer
    }
    */
    self.emit("synMessage", data);
  });

  routerEmitter.on("dataMessage", data => {
    /*
    data: {
      symmetricKey: string,
      data: buffer
    }
    */
    self.emit("dataMessage", data);
  });

  routerEmitter.on("parentLeft", data => {
    router.stopListen();
    self.emit("parentLeft", "");
  })

  // router error/status events to be defined.


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