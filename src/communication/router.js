// router
var dgram = require('dgram');
let externalIp = require('public-ip');
let internalIp = require('internal-ip');
let log = require("../log");
let packetHandler = require("./packetHandler");
let validator = require("../validator");
let util = require("../util");
let joinClient = require("../joinClient");

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

module.exports = function Router(db, emitter) {
  let client = dgram.createSocket('udp4');
  let listener = dgram.createSocket('udp4');
  client.bind(db.getSendPort());
/*
  let getCandidates = function(lst, channel) {
    let candidates = getCandidatesToSendTo(lst, channel);

    if(candidates.length === 0) {
      // Only enters here if message is going out of nodes channel (up the tree)
      let parent = db.getParent();
      if(!parent) {
        // Only happens if root node and there is no node on the branch where the message needs to be routed
        console.log("ERROR: No nodes to send message to");
        console.log("\tNeighbors: ", JSON.stringify(db.getNeighbors(), null, 2));
        console.log("\tChannel: '" + channel + "'");
        return [];
      }
      candidates.push(parent);
    }

    return candidates;
  };
*/
  // sends message to all neighbors without checking for route
  let sendPacketObjToNeighbors = function(packetObj) {
    let packet = packetHandler.createPacketBuffer(packetObj);
    let candidates = db.getNeighbors();
    if(!candidates.length === 0) {
      sendPacketToCandidates(candidates, packet);
    } else {
      console.log("warn", "No route to send packet to channel %s", packetObj.channel);
    }
  }

  // send message to all children without checking for route
  let sendPacketObjToChildren = function(packetObj) {
    let packet = packetHandler.createPacketBuffer(packetObj);
    let candidates = getChildren();
    sendPacketToCandidates(candidates, packetObj);
  }

  // send message to list of candidates
  let sendPacketToCandidates = function(candidates, packet) {
    let checksum = util.getChecksum(packet);
    for(var i = 0; i < candidates.length; i++) {
      sendPacket(packet, checksum, candidates[i]);
    }
  }

  // send the actual packet
  let sendPacket = function(packet, packetChecksum, destNeighbor) {
    let messageObj = {
      checksum: packetChecksum,
      packet: encryption.encryptSymmetric(packet, destNeighbor.symmetricKey)
    };

    let message = packetHandler.createMessageBuffer(message);

    send(destNeighbor.address, destNeighbor.receivePort, message);
  }

  let send = function(host, port, message) {
    console.log("debug", "Attempting to send message to %s:%d", host, port);
    client.send(message, 0, message.length, port, host, function(err) {
      if(err) {
        console.log("error", "Failed to send message to %s:%d, error:%s", host, port, err.message);
      } else {
        console.log("debug", "Successfully send message to  %s:%d", host, port);
      }
    });
  };

  let addChild = function(address, port, address, childPosition) {
    let symmetricKey = "SoonToBeGenerated";
    console.log("info", "Sending a join invitiation to candidate child with position channel %s", childPosition);
    joinClient.addChild(address, port, childPosition, db.getSendPort(), db.getReceivePort(), symmetricKey).then((obj) => {
      console.log("debug", "Successfully sent ParentRequest to candidate channel %s");
      db.addChild(address, obj.sendPort, obj.receivePort, childPosition, symmetricKey);
    }).catch((err) => {
      console.log("error", "Failed to add child with error: %s", err.message);
    });
  };

  let processSynPacket = function(packetObj, routingData) {
    sendPacketToCandidates(routingData.candidates, packetObj)

    emitter.emit("SynMessage", packetObj);
  }

  let processDataPacket = function(packetObj, routingData) {
    emmiter.emit("DataMessage", packetObj);
  }

  let processJoinPacket = function(packetObj, routingData) {
    // Make it so that the spot is reserved until someone joins the network
    // Propagate up if this node is fully reserved
    let position = db.getPosition();
    let childCount = db.getChildrenCount();
    if(db.isRoot() || packetObj.channel === position || (routingData.fromParent && db.getChannel() === packetObj.channel)) {
      if(childCount == 2) {
        // children saturated, random pick child to forward to
        util.getRandomNum(0,1).then(pick => {
          let otherPick = 1 - pick;
          let children = db.getChildren();
          // OUTGOING PACKETS
          let packet = packetHandler.createPacketBuffer(packetObj);
          sendPacket(packet, children[pick]);
          // TODO FOR LATER
          //sendPacket(packetObj, children[otherPick]);
        });
      } else {
        // SELECTED AS PARENT
        let newNeighbor = JSON.parse(packetObj.data.toString());
        let port = newNeighbor.port;
        let address = newNeighbor.address;
        // if node is already waiting for a child in the spot, we can send a retry to the client
         if(childCount == 1) {
          let child = db.getFirstChild();
          newPostFix = 1 - child.position[child.position.length - 1];
          addChild(address, port, address, position + newPostFix);
        } else {
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
        console.log("ERROR: Received join packet to a channel that doesn't exist");
        console.log("\troutingData: ", JSON.stringify(routingData, null, 2));
        console.log("\tpacketData: ", JSON.stringify(packetObj, null, 2));
        console.log("\tcandidateNodes: ", JSON.stringify(candidates, null, 2));
      } else {
        console.log(candidate);
        // OUTGOING PACKET
        let packet = packetHandler.createPacketBuffer(packetObj);
        sendPacket(packet, candidate);
      }
    } else if(!routingData.fromParent) {
      // Packet is 
      //  * not from parent node (going up)
      //  * not destined for sub-channel of this node
      //  * not destined for this nodes channel
      //  * not destined for this nodes subscribed channel
      // Only thing left is to route up

      // OUTGOING PACKET
      let packet = packetHandler.createPacketBuffer(packetObj);
      sendPacket(packetObj, db.getParent());
    } else {
        console.log("ERROR: PROCESSING JOIN PACKET, MISSING CASE");
        console.log("\troutingData: ", JSON.stringify(routingData, null, 2));
        console.log("\tpacketData: ", JSON.stringify(packetObj, null, 2));
        console.log("\n");
    }
  }

  let processLeavePacket = function(packetObj, routingData) {
    if(routingData.fromParent) {
      let candidates = db.getChildren();
      sendPacketToCandidates(candidates, packetObj);
      event.emit("parentLeft", "");
    } else {
      // Received leave from child, remove from neighbors
      let leaver = db.removeNeighbor(routingData.sender.address);
      // Nothing else needed to be done?
    }
  }

  let messageHandler = function(message, remote) {
    let routingData = db.getNeighborRoutingData(remote);
    console.log("Received message from ", remote);
    console.log("Routing data is as follows", routingData);

    if(!routingData.sender) {
      console.log("WARNING: message from unknown neighbor - ignoring message");
      console.log(remote);
      return;
    }

    let messageObj = packetHandler.parseMessageBuffer(message);

    messageObj.data = encryption.decryptSymmectric(messageObj.data, routingData.sender.key);

    if(!util.verifyChecksum(packetObj.data, packetObj.checksum)) {
      log("warn", "Packet from sender with address %s:%d did not pass checksum verification, ignoring", remote.address, remote.port, packetObj);
      return;
    }

    let packetObj = packetHandler.parsePacketBuffer(messageObj.data);

    if(isDestinedForNode(db.getChannel(), packetObj.channel)) {
      if(packetObj.packetType == "SYN") { // This packet might need to be decrypted differently to allow data to be sent
        let synDecrypted, symmetricKey;
        [decryptedData, symmetricKey] = encryption.decryptSymmectric(packetObj.data);
        if(util.verifyChecksum(decryptedData, packetObj.checksum)) {
          log("info", "Successfully received a SYN packet from the network");
          emmiter.emit("synMessage", {
            channel: JSON.parse(decryptedData.toString()),
            symmetricKey: symmetricKey
          });
        }
      } if(packetObj.packetType == "DATA") {
        let dataDecrypted, symmetricKey;
        [dataDecrypted, symmetricKey] = encryption.decryptAsymmetric(packetObj.data);
        if(util.verifyChecksum(dataDecrypted, packetObj.checksum)) {
          log("info", "Successfully received a DATA packet from the network")
          emmiter.emit("dataMessage", {
            symmetricKey: symmetricKey,
            data: dataDecrypted
            
          })
        }
      }
    }

    if(packetObj.packetType == "SYN"){
      processSynPacket(packetObj, routingData);
    } else if (packetObj.packetType == "DATA") {
      processDataPacket(packetObj, routingData);
    } else if (packetObj.packetType == "JOIN") {
      processJoinPacket(packetObj, routingData);
    } else if (packetObj.packetType == "LEAVE") {
      processLeavePacket(packetObj, routingData);
    }
  }

  this.leaveNetwork = function() {
    // Leave msg sent from a child to parent to remove them from neighbors.
    // Leave msg sent from parent to children to notify them to leave

    let body = {} // TODO: generate random data
    let buffer = Buffer.from(JSON.stringify(body));

    let packetObj = {
      packetType: "LEAVE",
      channel: db.getPosition(),
      checksum: util.getChecksum(buffer),
      data: buffer
    };

    let parent = db.getParent();
    if(parent) {
      let packet = packetHandler.createPacketBuffer(packetObj);
      sendPacket(packet, parent);
    }
    processLeavePacket(packetObj, {fromParent: true});
  }

  this.sendSynMsg = function(publicKey, options) {
    let channel, symmetricKey;
    // Perhaps this verification should happen in the server
    if(!options || !options.channel) {
      channel = "";
    }

    if(options && options.symmetricKey) {
      symmetricKey = options.symmetricKey;

      if(!validator.verifySymmetricKey(symmetricKey)) {
        log("warn", "Symmetric provided for Syn message did not pass validation");
        return;
      }
    } else {
      symmetricKey = ""; // TODO: generate symmetricKey
    }

    db.addSymmetricKey(symmetricKey);

    let obj = {
      symmetricKey: symmetricKey,
      channel: db.getChannel()
    }

    let buffer = Buffer.from(JSON.stringify(obj));

    let packetObj = {
      packetType: "SYN",
      channel: channel,
      checksum: util.getChecksum(buffer),
      data: buffer
    };
    
    packetObj.data = encryption.encryptAsymmetric(buffer, publicKey);

    sendPacketObjToNeighbors(packetObj);

    return symmetricKey;
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

  let serverListening = false;

  this.startListen = function() {
    if(!serverListening) {
      //Get the public and local ip's before starting the listener
      externalIp.v4().then(publicIp => {
        internalIp.v4().then(localIp => {
          
          //self.db.setAddress(publicIp);
          db.setAddress(localIp);
      
          listener.on("listening", function() {
            let address = listener.address();
            console.log('\tUDP Server listening on ' + address.address + ":" + address.port + "\n\n");
          });
      
          //Incoming message from another node 
          listener.on("message", function(message, remote) {
            //Send it to router
            messageHandler(message, remote);
          });
      
          listener.on("error", function(err) {
            console.error("Socket server error: ", err.message, "\nerr:", err);
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