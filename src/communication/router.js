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
  let encryption = new EnDeCrypt(db);
  let serverListening = false;
  let listener = dgram.createSocket('udp4');
  let client = dgram.createSocket('udp4');
  client.bind(db.getSendPort());

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

  // send packet to list of candidates
  let sendPacketToCandidates = function(candidates, packet) {
    let checksum = util.getChecksum(packet);
    for(var i = 0; i < candidates.length; i++) {
      sendPacketWithChecksum(packet, checksum, candidates[i]);
    }
  }

  let sendMessageObjToCandidates = function(candidates, messageObj) {
    // ASSUMING checksum is set and verified from before and packet has not changed
    let packet = messageObj.packet;
    for(var i = 0; i < candidates.length; i++) {
      messageObj.packet = encryption.encryptSymmetric(packet, candidates[i].symmetricKey);
      send(candidates[i].address, candidates[i].receivePort, parser.createMessageBuffer(messageObj));
    }
  }

  // send the actual packet
  let sendPacketWithChecksum = function(packet, packetChecksum, destNeighbor) {
    encryptedPacket = encryption.encryptSymmetric(packet, destNeighbor.symmetricKey);
    let messageObj = {
      checksum: packetChecksum,
      packet: encryptedPacket
    };

    let message = parser.createMessageBuffer(messageObj);

    send(destNeighbor.address, destNeighbor.receivePort, message);
  }

  let sendPacket = function(packet, destNeighbor) {
    let messageObj = {
      checksum: util.getChecksum(packet),
      packet: encryption.encryptSymmetric(packet, destNeighbor.symmetricKey)
    };
    
    let message = parser.createMessageBuffer(messageObj);
    send(destNeighbor.address, destNeighbor.receivePort, message);
  }

  let send = function(host, port, message) {
    log("debug", "Attempting to send message to %s:%d", host, port);
    console.log("MESSAGELEN: ", message.byteLength);
    client.send(message, 0, message.length, port, host, function(err) {
      if(err) {
        log("error", "Failed to send message to %s:%d, error:%s", host, port, err.message);
      } else {
        log("debug", "Successfully sent message to  %s:%d", host, port);
      }
    });
  };

  let sendPacketSync = function(candidates, packet) {
    return new Promise((resolve, reject) => {
      if(candidates.length === 0) {
        resolve();
        return;
      }

      let messageObj = {
        checksum: util.getChecksum(packet)
      };

      let returned = 0;
      for(let i = 0; i < candidates.length; i++) {
        messageObj.packet = encryption.encryptSymmetric(packet, candidates[i].symmetricKey);
        let message = parser.createMessageBuffer(messageObj);
        let address = candidates[i].address;
        let port = candidates[i].receivePort;
        
        console.log("MESSAGELEN: ", message.byteLength);
        client.send(message, 0, message.length, port, address, function(err) {
          returned++;
          if(err) {
            log("error", "Failed to send message to %s:%d, error:%s", address, port, err.message, err);
          }

          if(returned === candidates.length) {
            resolve();
          }
        });
      }
    });
  };

  let addChild = function(address, port, address, childPosition) {
    let symmetricKey = keyGenerator.generateSymmetricKey();
    
    log("info", "Sending a join invitiation to candidate child with position %s", childPosition);
    joinClient.addChild(address, port, childPosition, db.getSendPort(), db.getReceivePort(), symmetricKey).then((obj) => {
      log("debug", "Successfully sent ParentRequest to candidate channel %s, adding as neighbor", childPosition);
      db.addChild(address, obj.sendPort, obj.receivePort, childPosition, symmetricKey);
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

    if(packetObj.channel.startsWith(position) && position !== packetObj.channel) { // startsWith is true when equal
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
        // OUTGOING PACKET
        let packet = parser.createPacketBuffer(packetObj);
        sendPacket(packet, candidate);
      }
    } else if ((position.startsWith(packetObj.channel) && routingData.fromParent) || position === packetObj.channel) { 
      // inside correct channel and from parent, route down randomly or assign as child     
      if(noMoreRoomForChildren) {
        // children saturated, random pick child to forward to
        let packet = parser.createPacketBuffer(packetObj);
        if(childCount === 2) {
          util.getRandomNum(0,1).then(pick => {
            let children = db.getChildren();
            // OUTGOING PACKETS
            sendPacket(packet, children[pick]);
          });
        } else if (childCount === 1) {
          let child = db.getFirstChild();
          sendPacket(packet, child);
        } // else only potential children, no place to route join request, ignoring
      } else {
        // SELECTED AS PARENT
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
      sendPacket(packet, db.getParent());
    } else {
      log("error", "Missing case in join protocol\nnode pos: %s\n routingData\n%j",position, routingData, packetObj);
    }
  }

  let processLeavePacket = function(packetObj, routingData) {
    let candidates = routingData.candidates; 
    if(routingData.fromParent) {
      let packet = parser.createPacketBuffer(packetObj);
      sendPacketSync(candidates, packet).then(() => {
        // Expecting that the node that is leaving does not need event emmited
        log("info", "%d nodes have been notified of node departure", candidates.length);
        db.clearNeightbors();
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
    }
  }

  let messageHandler = function(message, remote) {
    let routingData = db.getNeighborRoutingData(remote);
    if(!routingData.sender) {
      // Can enter here if a node sends a leave message but is still listening
      log("warn", "Received message from a unknown neighbor with address %s:%d, ignoring message", remote.address, remote.port);
      return;
    }

    let messageObj = parser.parseMessageBuffer(message);
    messageObj.packet = encryption.decryptSymmetricWithKey(messageObj.packet, routingData.sender.symmetricKey);

    if(!util.verifyChecksum(messageObj.packet, messageObj.checksum)) {
      log("warn", "Packet from sender with address %s:%d with position '%s' did not pass checksum verification, ignoring message", remote.address, remote.port, routingData.sender.position, messageObj);
      return;
    }

    let packetObj = parser.parsePacketBuffer(messageObj.packet);
    
    if(isDestinedForNode(db.getChannel(), packetObj.channel)) {
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

    if (packetObj.packetType === "JOIN") {
      processJoinPacket(packetObj, routingData);
      return;
    } else if (packetObj.packetType === "LEAVE") {
      processLeavePacket(packetObj, routingData);
      return;
    }

    if(routingData.candidates.lenght === 0) {
      log("debug", "There are no candidates to receive packet from %s received from address %s:%d, not routing packet %j", (routingData.fromParent ? "parent" : "child"), routingData.sender.address, routingData.sender.sendPort, packetObj);
      return;
    }
    
    if (packetObj.packetType === "SYN" || packetObj.packetType === "DATA") {
      sendMessageObjToCandidates(routingData.candidates, messageObj);
    } else {
      log("error", "Missing case for packet type. packet: \n", JSON.stringify(packetObj, null, 2), "\n\nRouting data: \n", JSON.stringify(routingData, null, 2));
    }
  }

  this.leaveNetwork = function() {

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
    processLeavePacket(packetObj, {fromParent: true, candidates: db.getNeighbors(), thisNodeLeft: true});
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
      return;
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

    sendPacketToCandidates(getApplicableCandidatesForRouting(channel), parser.createPacketBuffer(packetObj));
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
    sendPacketToCandidates(getApplicableCandidatesForRouting(channel), parser.createPacketBuffer(packetObj));
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