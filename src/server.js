const externalIp = require('public-ip');
const internalIp = require('internal-ip');
const EventEmitter = require('events');
const joinServer = require("./joinServer");
const DataBase = require('./db');
const Router = require('./communication/router');
const util = require('util');
const keyGenerator = require("./crypto/keyGenerator");
const topology = require("./topology");


//This is the contructor
function P5Server(opts) {
  let jServer;
  let self = this;
  let db = new DataBase();
  self.isListening = false;

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
    //Returns a promise of the public ip where the server is listening
    self.isListening = true;
    return router.startListen();
  };

  this.stop = function() {
    self.isListening = false;
    jServer.close();
    router.leaveNetwork();
    router.stopListen();
    topology.leaveNetwork(db.getTopologyServers(), db.getNetworkId(), db.getPosition());
  };
  
  this.addSymmetricKey = function(key) {
    db.addSymmetricKey(key);
  };

  this.getTopologyServer = function() {
    return db.getTopologyServers()[0];
  };

  // this be promise for error reporting?
  this.sendSynMsg = function(publicKey, data, opts = {}) {
    // opts values are optional client side, needs to be defined before entering router.
    // {channel: string, symmetricKey: string}
    // symmetricKey validation length and type
    // data buffer max length to be defined
    let channel = opts.channel || "";
    let symmetricKey = opts.symmetricKey || keyGenerator.generateSymmetricKey(); 

    if(!data || !Buffer.isBuffer(data)) {
      data = new Buffer("");
    }

    // validation - TO DO Check the length of symmetric key
    db.addSymmetricKey(symmetricKey);

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
    console.log("New Data Message!");
    console.log(data);
    /*
    data: {
      symmetricKey: string,
      data: buffer
    }
    */
    self.emit("dataMessage", data);
  });

  routerEmitter.on("ParentLeft", data => {
    self.isListening = false;
    jServer.close();
    router.stopListen();
    topology.leaveNetwork(db.getTopologyServers(), db.getNetworkId(), db.getPosition());
    self.emit("ParentLeft");
  });

  routerEmitter.on("YouLeft", () => {
    self.emit("YouLeft");
  });

  // router error/status events to be defined.

  //Start joinServer -- Will listen for candidate nodes
  if(opts.joinServer) {
    jServer = opts.joinServer;
    jServer.setTopologyServers(opts.topologyServers);
    jServer.setNetworkId(opts.networkId);
  } else {
    jServer = new joinServer({
      topologyServers: opts.topologyServers,
      networkId: opts.networkId,
      joinPort: opts.joinPort
    });
  }

  jServer.on("joinRequest", data => {
    router.sendJoinMsg(data.address, data.port, data.channel);
  });

  // ctrl+c while in cmd line on windows
  if (process.platform === "win32") {
    var rl = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.on("SIGINT", function () {
      process.emit("SIGINT");
    });
  }

  // ctrl+c exit
  process.on("SIGINT", function () {
    console.log("Stopping server because of SIGINT");
    if(self.isListening) {
      self.stop();
    }
    setTimeout(function() {
      console.log("Exiting");
      process.exit();
    }, 1000);
  });
};

//Make P5 an emitter
util.inherits(P5Server, EventEmitter);

// Export the server class
module.exports = P5Server;