// router
const dgram = require('dgram');
const externalIp = require('public-ip');
const internalIp = require('internal-ip');
const log = require("../log");
const parser = require("./parser/packetParser");
const EnDeCrypt = require("./encryption");
const validator = require("../validator");
const util = require("../util");
const joinClient = require("../joinClient");
const keyGenerator = require("../crypto/keyGenerator");
const InterfaceHandler = require("./interfaces");
const topology = require("../topology");


let isDestinedForNode = function(nodePosition, destinationChannel) {
  return nodePosition.startsWith(destinationChannel) || destinationChannel.startsWith(nodePosition);
}

let getCandidatesToSendTo = function(candidates, channel) {
  let result = [];
  for(let i = 0; i < candidates.length; i++) {
    if(isDestinedForNode(candidates[i].position, channel)) {
      result.push(candidates[i]);
    }
  }
  return result;
}

module.exports = function Router(db, event) {
  let self = this;
  let encryption = new EnDeCrypt(db);
  let serverListening = false;
  let listener = dgram.createSocket('udp4');
  let client = dgram.createSocket('udp4');
  client.bind(db.getSendPort());

  let interfaceHandler = new InterfaceHandler(client);

  if(!db.isRoot()) {
    let parent = db.getParent();
    interfaceHandler.addInterface(parent);
  }

  let getApplicableCandidatesForRouting = function(channel) {
    let lst = db.getNeighbors();
    let candidates = getCandidatesToSendTo(lst, channel);

    if(candidates.length === 0) {
      // Only enters here if message is going out of nodes channel (up the tree)
      let parent = db.getParent();
      if(!parent) {
        log("error", "Trying to route to a channel but not path, node has no parent, node position is '%s' and packet is going to '%s'", db.getPosition(), channel);
        return [];
      }
      candidates.push(parent);
    }

    return candidates;
  };

  let addChild = function(address, port, address, childPosition) {
    let symmetricKey = keyGenerator.generateSymmetricKey();
    
    log("info", "Sending a join invitiation to candidate child with position %s", childPosition);
    joinClient.addChild(address, port, childPosition, db.getSendPort(), db.getReceivePort(), symmetricKey).then((obj) => {
      log("info", "Successfully sent ParentRequest to candidate node with position %s, adding as neighbor", childPosition);
      let newChild = db.addChild(address, obj.sendPort, obj.receivePort, childPosition, symmetricKey);
      interfaceHandler.addInterface(newChild);
      logMessage({sender: newChild});
      db.removePotentialChild();
    }).catch((err) => {
      log("error", "Failed to add child with error: %s", err.message);
      db.removePotentialChild();
    });
  };

  let processJoinPacket = function(packetObj, routingData) {
    // Make it so that the spot is reserved until someone joins the network
    // Propagate up if this node is fully reserved
    let position = db.getPosition();
    let childCount = db.getChildrenCount();
    let noMoreRoomForChildren = (childCount + db.getPotentialChildren()) >= 2;

    if(packetObj.channel.startsWith(position) && position !== packetObj.channel) {
      // needs to be routed further down, select right child
      let candidates = db.getChildren();
      let candidate = undefined;
      for(let i = 0; i < candidates.length; i++) {
        if(candidates[i] && packetObj.channel.startsWith(candidates[i].position)) {
          candidate = candidates[i];
          break;
        }
      }

      // if applicable child does not exist, error, channel not exist
      if(!candidate) {
        log("warn", "Received a join to a channel that doesn't exist, ignoring join");
      } else {
        let packet = parser.createPacketBuffer(packetObj);
        interfaceHandler.addToQueue(packet, candidate);
      }
    } else if ((position.startsWith(packetObj.channel) && routingData.fromParent) || position === packetObj.channel) { 
      // inside correct channel and from parent, route down randomly or assign as child     
      if(noMoreRoomForChildren) {
        // children saturated, random pick child to forward to
        let packet = parser.createPacketBuffer(packetObj);
        if(childCount === 2) {
          util.getRandomNum(0,1).then(pick => {
            let children = db.getChildren();
            interfaceHandler.addToQueue(packet, children[pick]);
          });
        } else if (childCount === 1) {
          let child = db.getFirstChild();
          interfaceHandler.addToQueue(packet, child);
        } // else only potential children, no place to route join request, ignoring
      } else {
        db.addPotentialChild();
        let newNeighbor = JSON.parse(parser.parseDataBuffer(packetObj.data).toString());
        let port = newNeighbor.port;
        let address = newNeighbor.address;
         if(childCount === 1) {
          let child = db.getFirstChild();
          newPostFix = 1 - child.position[child.position.length - 1];
          addChild(address, port, address, position + newPostFix);
        } else if(childCount === 0) {
          util.getRandomNum(0,1).then(newPostFix => {
            addChild(address, port, address, position + newPostFix);
          });
        }
      }
    } else if (!routingData.fromParent) {
      // OUTGOING PACKET
      let packet = parser.createPacketBuffer(packetObj);
      interfaceHandler.addToQueue(packet, db.getParent());
    } else {
      log("error", "Missing case in join protocol\nnode pos: %s\n routingData\n%j",position, routingData, packetObj);
    }
  }

  let processLeavePacket = function(packetObj, routingData) {
    let candidates = routingData.candidates; 
    if(routingData.fromParent) {
      let packet = parser.createPacketBuffer(packetObj);
      interfaceHandler.sendPacketSync(packet, candidates).then(() => {
        // Expecting that the node that is leaving does not need event emmited
        log("info", "%d nodes have been notified of node departure", candidates.length);
        interfaceHandler.closeAllInterfaces()
        db.clearNeighbors();
        if(!routingData.thisNodeLeft) {
          log("info", "Parent has left the network, please re-join");
          event.emit("ParentLeft");
        } else {
          event.emit("YouLeft");
        }
      });
    } else {
      // Received leave from child, remove from neighbors
      log("info", "Child has left the network, Removing child");
      let leaver = db.removeChild(routingData.sender);
      interfaceHandler.removeInterface(leaver);
    }
  }

  const KILL_WAIT = 4000; // wait 4 seconds before assuming abrupt departure
  let lastMessageLog = {}
  let lastCheck = new Date();

  let logMessage = function(routingData) {
    let time = new Date();
    lastMessageLog[routingData.sender.position] = time
    if((time - lastCheck) > KILL_WAIT) {
      let keys = Object.keys(lastMessageLog);
      //log("debug", "checking last message interval");
      for(let i = 0; i < keys.length; i++) {
        if(time - lastMessageLog[keys[i]] > 4000) {
          log("info", "Node with Position '%s' has not sent a message in %dms", keys[i], time - lastMessageLog[keys[i]]);
          let neighbor = db.getNeighborWithPos(keys[i]);
          if(neighbor) {
            if(db.isParent(neighbor)) {
              log("info", "Node is parent, need to leave network");
              self.leaveNetwork(false);
            } else {
              log("info", "Node is child, removing from topology ");
              topology.leaveNetwork(db.getTopologyServers(), db.getNetworkId(), neighbor.position).catch((res) => {
                log("info", "Topology returned error %s, no biggie, continuing", res.message);
              });
              interfaceHandler.removeInterface(neighbor);
              db.removeChild(neighbor);
            }
          }
          delete lastMessageLog[keys[i]];
        }
      }
      lastCheck = time;
    }
  };

  let messageHandler = function(message, remote) {
    let routingData = db.getNeighborRoutingData(remote);
    if(!routingData.sender) {
      // Unknown sender, ignoring
      return;
    }

    logMessage(routingData);

    let messageObj = parser.parseMessageBuffer(message);
    messageObj.packet = encryption.decryptSymmetricWithKey(messageObj.packet, routingData.sender.symmetricKey);

    if(!util.verifyChecksum(messageObj.packet, messageObj.checksum)) {
      // Noise packet or invalid packet, dropping
      return;
    }

    let packetObj = parser.parsePacketBuffer(messageObj.packet);
    
    if(isDestinedForNode(db.getChannel(), packetObj.channel)) {
      log("info", "Received packet destined for my channel '%s'", db.getChannel());
      if(packetObj.packetType === "SYN") {
        let decryptedData = encryption.decryptAsymmetric(packetObj.data.slice(2,258));
        if(decryptedData) {
          log("info", "Successfully received a SYN packet from the network");
          let synObj = parser.parseSynBuffer(decryptedData);
          let synData = encryption.decryptSymmetricWithKey(parser.parseDataBuffer(packetObj.data).slice(256), synObj.symmetricKey);
          event.emit("synMessage", {
            channel: synObj.channel,
            symmetricKey: synObj.symmetricKey,
            data: synData
          });
        }
      } else if(packetObj.packetType === "DATA") {
        let dataDecrypted, symmetricKey;
        [dataDecrypted, symmetricKey] = encryption.decryptSymmetricWithChecksum(packetObj.data, packetObj.checksum);
        if(symmetricKey) {
          log("info", "Successfully received a DATA packet from the network");
          event.emit("dataMessage", {
            symmetricKey: symmetricKey,
            data: parser.parseDataBuffer(dataDecrypted)
          });
        }
      }
    }
    log("info", "Forwarding %s packet", packetObj.packetType);

    if (packetObj.packetType === "JOIN") {
      processJoinPacket(packetObj, routingData);
      return;
    } else if (packetObj.packetType === "LEAVE") {
      processLeavePacket(packetObj, routingData);
      return;
    }

    if(routingData.candidates.lenght === 0) {
      log("info", "There are no candidates to receive packet from %s received from address %s:%d, not routing packet %j", (routingData.fromParent ? "parent" : "child"), routingData.sender.address, routingData.sender.sendPort, packetObj);
      return;
    }
    
    if (packetObj.packetType === "SYN" || packetObj.packetType === "DATA") {
      interfaceHandler.addToMultipleQueues(messageObj.packet, routingData.candidates);
    } else {
      log("error", "Missing case for packet type. packet: \n", JSON.stringify(packetObj, null, 2), "\n\nRouting data: \n", JSON.stringify(routingData, null, 2));
    }
  }

  this.leaveNetwork = function(thisNodeLeft = true) {

    let obj = {
      realLen: 0,
      data: util.getRandomBytes(992)
    };

    let buffer = parser.createDataBuffer(obj);

    let packetObj = {
      packetType: "LEAVE",
      channel: db.getPosition(),
      checksum: util.getChecksum(buffer),
      data: buffer
    };
    processLeavePacket(packetObj, {fromParent: true, candidates: db.getNeighbors(), thisNodeLeft: thisNodeLeft});
  }

  this.sendJoinMsg = function(address, port, channel) {
    let data = {
      address: address,
      port: port
    };

    let buffer = Buffer.from(JSON.stringify(data));

    let obj = {
      realLen: buffer.byteLength,
      data: util.fillSynJoinDataBuff(buffer)
    };

    let buff = parser.createDataBuffer(obj);

    let packetObj = {
      packetType: "JOIN",
      channel: channel,
      checksum: util.getChecksum(buff),
      data: buff
    };

    processJoinPacket(packetObj, {fromParent: false});
  }

  this.sendSynMsg = function(publicKey, channel, symmetricKey, data) {
    
    let synObj = {
      symmetricKey: symmetricKey,
      channel: db.getChannel()
    };

    let asymBuff;
    try {
      asymBuff = encryption.encryptAsymmetric(parser.createSynBuffer(synObj), publicKey);    
    } catch(err) {
      log("error", "Failed to encrypt data with publicKey, not sending, error: %s", err.message, err);
      return false;
    }
    let symBuff = encryption.encryptSymmetric(data, symmetricKey);

    let synBuff = Buffer.concat([asymBuff, symBuff]);

    let obj = {
      realLen: synBuff.byteLength,
      data: util.fillSynJoinDataBuff(synBuff)
    };

    let buff = parser.createDataBuffer(obj);

    let packetObj = {
      packetType: "SYN",
      channel: channel,
      checksum: util.getChecksum(synBuff),
      data: buff
    };

    interfaceHandler.addToMultipleQueues(parser.createPacketBuffer(packetObj), getApplicableCandidatesForRouting(channel));
    return true;
  }

  this.sendDataMsg = function(symmetricKey, data, channel) {
    let obj = {
      realLen: data.byteLength,
      data: util.fillDataBuff(data)
    }

    let buff = parser.createDataBuffer(obj);

    let packetObj = {
      packetType: "DATA",
      channel: channel,
      checksum: util.getChecksum(buff)
    };

    packetObj.data = encryption.encryptSymmetric(buff, symmetricKey);
    interfaceHandler.addToMultipleQueues(parser.createPacketBuffer(packetObj), getApplicableCandidatesForRouting(channel));
  }

  this.startListen = function() {
    if(!serverListening) {
      //Get the public and local ip's before starting the listener
      return externalIp.v4().then(publicIp => {
        return internalIp.v4().then(localIp => {
          
          db.setAddress(publicIp);
          log("info", "MY POSITION IS: %s \nPublicKey is:  \n\n%s\n\njoinInfo: %s:%d", db.getPosition(), db.getPublicKey(), publicIp, db.getJoinPort());
          listener.on("listening", function() {
            let address = listener.address();
            log("info", "UDP Server listening on '%s:%d'", address.address, address.port);
          });
      
          //Incoming message from another node 
          listener.on("message", function(message, remote) {
            messageHandler(message, remote);
          });
      
          listener.on("error", function(err) {
            log("error", "Socket server error: %s", err.message, err);
          });
    
          //Start Listener
          listener.bind(db.getReceivePort(), localIp);

          return publicIp;
        });
      });
    } else {
      return new Promise((resolve) => { resolve('0.0.0.0') });
    }
  }

  this.stopListen = function() {
    return new Promise((resolve, reject) => {
      if(serverListening) {
        listener.close(() => {
          serverListening = false;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}