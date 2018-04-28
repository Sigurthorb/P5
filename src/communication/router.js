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
const timer = require("simple-timer");


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
    
    let messageObj = {
      checksum: packetChecksum,
      packet: encryption.encryptSymmetric(packet, destNeighbor.symmetricKey)
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
      if(candidates.lenght === 0) {
        resolve();
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
    let symmetricKey = "SoonToBeGenerated";
    
    log("info", "Sending a join invitiation to candidate child with position %s", childPosition);
    joinClient.addChild(address, port, childPosition, db.getSendPort(), db.getReceivePort(), symmetricKey).then((obj) => {
      log("debug", "Successfully sent ParentRequest to candidate channel %s, adding as neighbor");
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
    if(db.isRoot() || packetObj.channel === position || (routingData.fromParent && db.getChannel() === packetObj.channel)) {
      if((childCount + db.getPotentialChildren()) >= 2) {
        // children saturated, random pick child to forward to
        if(childCount === 2) {
          util.getRandomNum(0,1).then(pick => {
            let children = db.getChildren();
            // OUTGOING PACKETS
            let packet = parser.createPacketBuffer(packetObj);
            sendPacket(packet, children[pick]);
          });
        } else if (childCount === 1) {
          let child = db.getFirstChild();
          sendPacket(packet, child);
        } // else only potential children, no place to route join request, ignoring
      } else {
        // SELECTED AS PARENT
        db.addPotentialChild();
        let newNeighbor = JSON.parse(packetObj.data.toString());
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
    } else if(packetObj.channel.startsWith(position)) {
      // Being routed, needs to go further down
      // select applicable child that starts with data.position
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
    } else if(!routingData.fromParent) {
      // OUTGOING PACKET
      let packet = parser.createPacketBuffer(packetObj);
      sendPacket(packet, db.getParent());
    } else {
      log("error", "Missing case in join protocol: routingData\n%j", routingData, packetObj);
    }
  }

  let processLeavePacket = function(packetObj, routingData) {
    let candidates = routingData.candidates; 
    if(routingData.fromParent) {
      if(candidates.length === 0) {
        // Expecting that the node that is leaving does not need event emmited
        if(!routingData.thisNodeLeft) {
          log("info", "Parent has left the network, please re-join");
          event.emit("parentLeft");
        }
        return;
      }
      
      let packet = parser.createPacketBuffer(packetObj);
      sendPacketSync(candidates, packet).then(() => {
        // Expecting that the node that is leaving does not need event emmited
        if(!routingData.thisNodeLeft) {
          log("info", "Parent has left the network, please re-join");
          event.emit("parentLeft", "");
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
      log("warn", "Received message from a unknown neighbor, ignoring message");
      return;
    }

    let messageObj = parser.parseMessageBuffer(message);
    messageObj.packet = encryption.decryptSymmetricWithKey(messageObj.packet, routingData.sender.key);

    if(!util.verifyChecksum(messageObj.packet, messageObj.checksum)) {
      log("warn", "Packet from sender with address %s:%d with position '%s' did not pass checksum verification, ignoring message", remote.address, remote.port, routingData.sender.position, messageObj);
      return;
    }

    let packetObj = parser.parsePacketBuffer(messageObj.packet);
    
    if(isDestinedForNode(db.getChannel(), packetObj.channel)) {
      if(packetObj.packetType == "SYN") {
        let decryptedData, successfulDecryption;
        [decryptedData, successfulDecryption] = encryption.decryptAsymmetric(packetObj.data, packetObj.checksum);
        if(successfulDecryption) {
          log("info", "Successfully received a SYN packet from the network");
          let synObj = parser.parseSynBuffer(decryptedData);
          event.emit("synMessage", {
            channel: synObj.channel,
            symmetricKey: synObj.symmetricKey,
            data: synObj.data
          });
        }
      } else if(packetObj.packetType == "DATA") {
        let dataDecrypted, symmetricKey;
        [dataDecrypted, symmetricKey] = encryption.decryptSymmetricWithChecksum(packetObj.data, packetObj.checksum);
        if(symmetricKey) {
          log("info", "Successfully received a DATA packet from the network");
          event.emit("dataMessage", {
            symmetricKey: symmetricKey,
            data: dataDecrypted
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
      log("info", "There are no candidates to receive packet from %s received from address %s:%d, not routing packet %j", (routingData.fromParent ? "parent" : "child"), routingData.sender.address, routingData.sender.sendPort, packetObj);
      return;
    }
    
    if (packetObj.packetType === "SYN" || packetObj.packetType === "DATA") {
      sendMessageObjToCandidates(routingData.candidates, packetObj);
    } else {
      log("error", "Missing case for packet type. packet: \n", JSON.stringify(packetObj, null, 2), "\n\nRouting data: \n", JSON.stringify(routingData, null, 2));
    }
  }

  this.leaveNetwork = function() {
    let body = {} // TODO: generate random data
    let buffer = Buffer.from("This is a test data");

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

    let packetObj = {
      packetType: "JOIN",
      channel: channel,
      checksum: util.getChecksum(buffer),
      data: buffer
    };

    processJoinPacket(packetObj, {fromParent: false});
  }

  this.sendSynMsg = function(publicKey, channel, symmetricKey, data) {

    let synObj = {
      symmetricKey: symmetricKey,
      channel: db.getChannel(),
      data: data
    };

    let synBuff = parser.createSynBuffer(synObj);

    let packetObj = {
      packetType: "SYN",
      channel: channel,
      checksum: util.getChecksum(synBuff)
    };
    
    packetObj.data = encryption.encryptAsymmetric(buffer, publicKey);
    let packet = parser.getParent
    sendPacketToCandidates(getApplicableCandidatesForRouting(channel), getCandidatespacketObj);
  }

  this.sendDataMsg = function(buffer, symmetricKey, channel) {
    let packetObj = {
      packetType: "DATA",
      channel: channel,
      checksum: util.getChecksum(buffer)
    };

    packetObj.data = encryption.encryptSymmetric(buffer, symmetricKey);
    sendPacketObjToNeighbors(packet);
  }

  this.startListen = function() {
    if(!serverListening) {
      //Get the public and local ip's before starting the listener
      externalIp.v4().then(publicIp => {
        internalIp.v4().then(localIp => {
          
          db.setAddress(publicIp);
      
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
        });
      });
    }
  }

  this.stopListen = function() {
    if(serverListening) {
      listener.close(function() {
        serverListening = false;
      });
    }
  }
}