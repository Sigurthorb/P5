const externalIp = require('public-ip');
const internalIp = require('internal-ip');
const EventEmitter = require('events');
const JoinServer = require("./joinServer");
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

  console.log("\nNodeInfo:\n\tsendPort:%d\n\treceivePort:%d\n\tjoinPort:%d\n", opts.sendPort, opts.receivePort, opts.joinPort);

  //Store this on the db
  db.setTopologyServers(opts.topologyServers);
  db.setNetworkId(opts.networkId);
  db.setChannelAsymmetricKeys(opts.keys);
  db.setPosition(opts.position);

  //Add parent if necessary
  if(opts.parent) {
    db.setParent(opts.parent.address, opts.parent.sendPort, opts.parent.receivePort, opts.parent.position, opts.parent.symmetricKey);
  } else {
    db.setAsRoot();
  }

  let routerEmitter = new EventEmitter();
  let router = new Router(db, routerEmitter);
  EventEmitter.call(this);

  //Update variables and add listener to existing the join server
  if(opts.joinServer) {
    jServer = opts.joinServer;
    jServer.setTopologyServers(opts.topologyServers);
    jServer.setNetworkId(opts.networkId);

    jServer.on("joinRequest", data => {
      router.sendJoinMsg(data.address, data.port, data.channel);  
    });
  }

  //Make this accessible to the user
  this.key = opts.keys.publicKey;
  this.channel = opts.channel;

  this.stop = function() {
    self.isListening = false;
    return new Promise((resolve, reject) => {
      //Once the packet has been sent, continue
      routerEmitter.on("YouLeft", () => {
      //Close Servers then resolve
        Promise.all([
          jServer.close(),
          router.stopListen(),
          topology.leaveNetwork(db.getTopologyServers(), db.getNetworkId(), db.getPosition())
        ]).then(resolve);
      });

      router.leaveNetwork();
    });
  };

  this.addSymmetricKey = function(key) {
    db.addSymmetricKey(key);
  };

  this.getTopologyServer = function() {
    return db.getTopologyServers()[0];
  };

  //Make this accessible to the user
  this.key = opts.keys.publicKey;
  this.channel = opts.channel;

  this.start = function() {
    //Make sure the jServer has been started - If not, start it
    if(!opts.joinServer) {
      return new JoinServer({
        topologyServers: opts.topologyServers,
        networkId: opts.networkId,
        joinPort: opts.joinPort
      }).then(server => {
        jServer = server;

        jServer.on("joinRequest", data => {
          router.sendJoinMsg(data.address, data.port, data.channel);
        });

        return jServer.start().then(() => {
          return router.startListen();
        }).catch(err => {
          console.error(err.message);
        });
      });
    } else {
      //Returns a promise of the public ip where the server is listening
      return router.startListen();
    }
  };

  this.stop = function() {
    //First, send leave message and wait utinl it actually happens
    router.leaveNetwork();
    return new Promise((resolve, reject) => {
      //Once the packet has been sent, continue
      routerEmitter.on("YouLeft", () => {
        //Close Servers then resolve
        Promise.all([
          jServer.close(),
          router.stopListen(),
          topology.leaveNetwork(db.getTopologyServers(), db.getNetworkId(), db.getPosition())
        ]).then(resolve);
      });
    });
  };

  this.addSymmetricKey = function(key) {
      db.addSymmetricKey(key);
  };

  this.getTopologyServer = function() {
      return db.getTopologyServers()[0];
  };

  this.sendSynMsg = function(publicKey, data, opts = {}) {
    // opts values are optional client side, needs to be defined before entering router.
    // {channel: string, symmetricKey: string}
    // symmetricKey validation length and type
    // data buffer max length to be defined
    let channel = opts.channel || "";
    let symmetricKey = opts.symmetricKey || keyGenerator.generateSymmetricKey();

    if(symmetricKey.length !== 16) {
      return false;
    }

    if(!data) {
      data = new Buffer("");
    }

    if(!Buffer.isBuffer(data)  || data.byteLength > 720) {
      return false;
    }

    db.addSymmetricKey(symmetricKey);

    let success = router.sendSynMsg(publicKey, channel, symmetricKey, data);

    return sucess && symmetricKey;
  };

  this.sendDataMsg = function(symmetricKey, data, channel = "") {
    //validation
    if(!Buffer.isBuffer(data)  || data.byteLength > 976) {
      return false;
    }

    if(symmetricKey.length !== 16) {
      return false;
    }

    router.sendDataMsg(symmetricKey, data, channel);
  };

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

  routerEmitter.on("ParentLeft", data => {
    console.log("Parent left");
    //Close Servers then emit
    Promise.all([
      jServer.close(),
      router.stopListen(),
      topology.leaveNetwork(db.getTopologyServers(), db.getNetworkId(), db.getPosition())
    ]).then(() => {
      self.emit("parentLeft");
      //process.exit();
    });
  });

  // router error/status events to be defined.

  // ctrl+c while in cmd line on windows
  /*if (process.platform === "win32") {
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
    console.log("Stopping server");
    self.stop().then(() => {
      process.exit();
    });
  });*/
};

//Make P5 an emitter
util.inherits(P5Server, EventEmitter);

// Export the server class
module.exports = P5Server;