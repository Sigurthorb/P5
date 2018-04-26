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
	db.setChannelAsymmetricKeys(opts.keys);
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
    router.leaveNetwork();
		router.stopListen();
	}

  // this be promise for error reporting?
	this.sendSynMsg = function(publicKey, opts) {
    // opts values are optional client side, needs to be defined before entering router.
    // {channel: string, symmetricKey: string, data: Buffer}
    // symmetricKey validation length and type
    // data buffer max length to be defined

    let channel = opts.channel;
    let symmetricKey = opts.symmetricKey
    let data = opts.data;

    // validation
    db.addSymmetricKey(symmetricKey);
    router.sendSynMsg(publicKey, channel, symmetricKey, data);

	};

  // this be promise for error reporting?
  this.sendDataMsg = function(symmetricKey, dataBuffer, channel = "") {
    //validation
    router.sendDataMsg(channel, symmetricKey, dataBuffer);
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
    self.emit("synMessage", data);
  });

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