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

    //Update variables and add listener to existing the join server
    if(opts.joinServer) {
        jServer = opts.joinServer;
        jServer.setTopologyServers(opts.topologyServers);
        jServer.setNetworkId(opts.networkId);

        jServer.on("joinRequest", data => {
            console.log(data);
            router.sendJoinMsg(data.address, data.port, data.channel);  
        });
    }

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
                console.log('jServer');
                console.log(jServer);

                jServer.on("joinRequest", data => {
                    console.log(data);
                    router.sendJoinMsg(data.address, data.port, data.channel);  
                });

                
                return jServer.start().then(() => {
                    return router.startListen();
                }).catch(err => {
                    console.error(err);
                });

            });

        } else {
            //Returns a promise of the public ip where the server is listening
            return router.startListen();
        }
    };

    this.stop = function() {
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
        router.stopListen();
        topology.leaveNetwork(db.getTopologyServers(), db.getNetworkId(), db.getPosition());
        self.emit("ParentLeft");
        });

        routerEmitter.on("YouLeft", () => {
        self.emit("YouLeft");
    });

    // router error/status events to be defined.
};

//Make P5 an emitter
util.inherits(P5Server, EventEmitter);

// Export the server class
module.exports = P5Server;