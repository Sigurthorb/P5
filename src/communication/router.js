// router
var dgram = require('dgram');
let externalIp = require('public-ip');
let internalIp = require('internal-ip');
let log = require("../log");
let packetParser = require("./parser/packetParser");
let EnDeCrypt = require("./encryption");
let validator = require("../validator");
let util = require("../util");
let joinClient = require("../joinClient");
let timer = require("simple-timer");

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
  let client = dgram.createSocket('udp4');
  let listener = dgram.createSocket('udp4');
  console.log("SEND PORT !!!!:::!!!! " + db.getSendPort());
  client.bind(db.getSendPort());
  let encryption = new EnDeCrypt(db);
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
  // sends packet to all neighbors without checking for route
  let sendPacketObjToNeighbors = function(packetObj) {
    let packet = packetParser.createPacketBuffer(packetObj);
    let candidates = db.getNeighbors();
    if(!candidates.length === 0) {
      sendPacketToCandidates(candidates, packet);
    } else {
      console.log("warn", "No route to send packet to channel %s", packetObj.channel);
    }
  }

  // send packet to all children without checking for route
  let sendPacketObjToChildren = function(packetObj) {
    let packet = packetParser.createPacketBuffer(packetObj);
    let candidates = getChildren();
    sendPacketToCandidates(candidates, packetObj);
  }

  // send packet to list of candidates
  let sendPacketToCandidates = function(candidates, packet) {
    let checksum = util.getChecksum(packet);
    for(var i = 0; i < candidates.length; i++) {
      sendPacketWithChecksum(packet, checksum, candidates[i]);
    }
  }

  // send the actual packet
  let sendPacketWithChecksum = function(packet, packetChecksum, destNeighbor) {

    let encryptedPacket = encryption.encryptSymmetric(packet, destNeighbor.symmetricKey);
    let message = packetParser.createMessageBuffer(encryptedPacket, packetChecksum);

    send(destNeighbor.address, destNeighbor.receivePort, message);
  }

  let sendPacket = function(packet, destNeighbor) {
    let message = packetParser.createMessageBuffer(packet, util.getChecksum(packet));
    send(destNeighbor.address, destNeighbor.receivePort, message);
  }

  let send = function(host, port, message) {
    console.log(host, port);
    console.log("debug", "Attempting to send message to %s:%d", host, port);
    client.send(message, 0, message.length, port, host, function(err) {
      if(err) {
        console.log("error", "Failed to send message to %s:%d, error:%s", host, port, err.message);
      } else {
        console.log("debug", "Successfully send message to  %s:%d", host, port);
      }
    });
  };

  let sendPacketSync = function(candidates, packet) {
    
    return new Promise((resolve, reject) => {
      if(candidates.lenght === 0) {
        resolve();
      }
      let checksum = util.getChecksum(packet);
      let num = candidates.length;
      let returned = 0;
      timer.start('sendPacketSyncTimer')
      for(let i = 0; i < candidates.length; i++) {
        let encryptedPacket = encryption.encryptSymmetric(packet, candidates[i].symmetricKey);
        let message = packetParser.createMessageBuffer(encryptedPacket, checksum);
        let address = candidates[i].address;
        let port = candidates[i].receivePort;
        client.send(message, 0, message.length, port, address, function(err) {
          returned++;
          if(err) {
            console.log("error", "Failed to send message to %s:%d, error:%s", address, port, err.message);
          } else {
            console.log("debug", "Successfully send message to  %s:%d", address, port);
          }

          if(returned === candidates.length) {
            console.log("DONE SYNC DONE SYNC YEAHHHHH")
            timer.stop('sendPacketSyncTimer')
            resolve();
          }
        });
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

    event.emit("SynMessage", packetObj);
  }

  let processDataPacket = function(packetObj, routingData) {
    event.emit("DataMessage", packetObj);
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
          let packet = packetParser.createPacketBuffer(packetObj);
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
        let packet = packetParser.createPacketBuffer(packetObj);
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
      let packet = packetParser.createPacketBuffer(packetObj);
      sendPacket(packet, db.getParent());
    } else {
      console.log("ERROR: PROCESSING JOIN PACKET, MISSING CASE");
      console.log("\troutingData: ", JSON.stringify(routingData, null, 2));
      console.log("\tpacketData: ", JSON.stringify(packetObj, null, 2));
      console.log("\n");
    }
  }

  let processLeavePacket = function(packetObj, routingData) {
    if(routingData.fromParent) {
      if(db.getChildrenCount() === 0) {
        // TODO:: remove before commit
        //if(!routingData.thisNodeLeft) {
          event.emit("parentLeft", "");        
        //}
        return;
      }
      let candidates = db.getChildren();
      let packet = packetParser.createPacketBuffer(packetObj);
      sendPacketSync(candidates, packet).then(() => {
        console.log("\n\nIt took %s ms for pos %s to leave", timer.get("sendPacketSyncTimer").delta, db.getPosition());
        // TODO:: remove before commit
        //if(!routingData.thisNodeLeft) {
            event.emit("parentLeft", "");
        //}
      });

    } else {
      // Received leave from child, remove from neighbors
      console.log("!!!!!!REMOVING CHILD!!!!!!");
      let leaver = db.removeChild(routingData.sender);
      // Nothing else needed to be done?
    }
  }

  let messageHandler = function(message, remote) {
    let routingData = db.getNeighborRoutingData(remote);
    console.log("Routing data is as follows", routingData);

    if(!routingData.sender) {
      console.log("WARNING: message from unknown neighbor - ignoring message");
      console.log(remote);
      return;
    }

    let messageObj = packetParser.parseMessageBuffer(message);

    messageObj.packet = encryption.decryptSymmetric(messageObj.packet, routingData.sender.key);

    if(!util.verifyChecksum(messageObj.packet, messageObj.checksum)) {
      log("warn", "Packet from sender with address %s:%d did not pass checksum verification, ignoring", remote.address, remote.port, packetObj);
      return;
    }

    let packetObj = packetParser.parsePacketBuffer(messageObj.packet);

    console.log(packetObj);
    
    if(isDestinedForNode(db.getChannel(), packetObj.channel)) {
      if(packetObj.packetType == "SYN") { // This packet might need to be decrypted differently to allow data to be sent
        let synDecrypted, symmetricKey;
        [decryptedData, symmetricKey] = encryption.decryptSymmectric(packetObj.data);
        if(util.verifyChecksum(decryptedData, packetObj.checksum)) {
          log("info", "Successfully received a SYN packet from the network");
          event.emit("synMessage", {
            channel: JSON.parse(decryptedData.toString()),
            symmetricKey: symmetricKey
          });
        }
      } else if(packetObj.packetType == "DATA") {
        let dataDecrypted, symmetricKey;
        [dataDecrypted, symmetricKey] = encryption.decryptAsymmetric(packetObj.data);
        if(util.verifyChecksum(dataDecrypted, packetObj.checksum)) {
          log("info", "Successfully received a DATA packet from the network")
          event.emit("dataMessage", {
            symmetricKey: symmetricKey,
            data: dataDecrypted
          });
        }
      }
    }

    console.log("befoer if ");

    if (packetObj.packetType == "JOIN") {
      processJoinPacket(packetObj, routingData);
    } else if (packetObj.packetType == "LEAVE") {
      console.log("before leave");
      processLeavePacket(packetObj, routingData);
    }
    console.log("after if")
    if(routingData.candidates.lenght === 0) {
      console.log("info", "There are no candidates to receive packet from %s received from address %s:%d, not routing packet %j", (routingData.fromParent ? "parent" : "child"), routingData.sender.address, routingData.sender.sendPort, packetObj);
      return;
    }
    
    if(packetObj.packetType == "SYN"){
      processSynPacket(packetObj, routingData);
    } else if (packetObj.packetType == "DATA") {
      processDataPacket(packetObj, routingData);
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

    let parent = db.getParent();
    if(parent) {
      let packet = packetParser.createPacketBuffer(packetObj);
      sendPacket(packet, parent);
    }

    if(db.getChildrenCount() > 0) {
      processLeavePacket(packetObj, {fromParent: true, thisNodeLeft: true});
    }
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

    let packetObj = {
      packetType: "SYN",
      channel: channel,
      data: {
        symmetricKey: symmetricKey,
        channel: db.getChannel(),
        symmetricKey: symmetricKey,
        data: data
      }
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



  let serverListening = false;

  this.startListen = function() {
    if(!serverListening) {
      //Get the public and local ip's before starting the listener
      externalIp.v4().then(publicIp => {
        internalIp.v4().then(localIp => {
          
          db.setAddress(publicIp);
          //db.setAddress(localIp);
      
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