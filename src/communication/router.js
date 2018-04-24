// router
var dgram = require('dgram');
let externalIp = require('public-ip');
let internalIp = require('internal-ip');
let log = require("../log");
let packetHandler = require("./packetHandler");
let validator = require("../validator");
let util = require("../util");
let joinClient = require("../joinClient");

let isDestinedForChannel = function(nodeChannel, destinationChannel) {
  return nodeChannel.startsWith(destinationChannel) || destinationChannel.startsWith(nodeChannel);
}

let getCandidatesToSendTo = function(candidates, channel) {
  let result = [];
  for(let i = 0; i < candidates.length; i++) {
    if(isDestinedForChannel(candidates[i].channel, channel)) {
      result.push(candidates[i]);
    }
  }
  return result;
}

module.exports = function Router(db, messageCb) {
  let client = dgram.createSocket('udp4');
  let listener = dgram.createSocket('udp4');
  client.bind(db.getSendPort());

  let send = function(host, port, message) {
    log("debug", "Attempting to send message to %s:%d", host, port);
    client.send(message, 0, message.length, port, host, function(err) {
      if(err) {
        log("error", "Failed to send message to %s:%d, error:%s", host, port, err.message);
      } else {
        log("debug", "Successfully send message to  %s:%d", host, port);
      }
    });
  };

  let sendPacketObject = function(packetObj, destNeighbor) {
    let packet = packetHandler.createPacket(packetObj);
    send(destNeighbor.address, destNeighbor.receivePort, packet);
  }

  let sendPacket = function(packet, destNeighbor) {
    send(destNeighbor.address, destNeighbor.receivePort, packet);
  }

  let addChild = function(address, port, address, childPosChannel, newPostFix) {
    let symmetricKey = "SoonToBeGenerated";
    log("info", "Sending a join invitiation to candidate child with position channel %s", childPosChannel);
    joinClient.addChild(address, port, childPosChannel, db.getSendPort(), db.getReceivePort(), symmetricKey).then((obj) => {
      log("debug", "Successfully send request to candidateChannel %s");
      db.addChild(obj.address, obj.sendPort, obj.receivePort, newPostFix);
    }).catch((err) => {
      log("error", "Failed to add child with error: %s", err.message, err);
    })
  }

  let getCandidates = function(lst, channel) {
    let candidates = getCandidatesToSendTo(lst, channel);

    if(candidates.length === 0) {
      // Only enters here if message is going out of nodes channel (up the tree)
      let parent = db.getParent();
      if(!parent) {
        // Only happens if root node and there is no node on the branch where the message needs to be routed
        console.log("ERROR: No nodes to send message to");
        console.log("\tNeighbors: ", JSON.stringify(data.getNeighbors(), null, 2));
        console.log("\tChannel: ", channel);
        return [];
      }
      candidates.push(parent);
    }

    return candidates;
  }

  let processSynPacket = function(packetObj, routingData) {
    let candidates = getCandidatesToSendTo(routingData.candidates, packetObj.channel);
    
    for(let i = 0; i < candidates.length; i++) {
      console.log("SENDING MESSAGE TO CANDIDATE")
      sendPacketObject(packetObj, candidates[i]);
    }

    messageCb(packetObj);
  }

  let processDataPacket = function(packetObj, routingData) {

  }

  let processJoinPacket = function(packetObj, routingData) {
    // Make it so that the spot is reserved until someone joins the network
    // Propagate up if this node is fully reserved
    if(packetObj.channel === db.getCommChannel() || (routingData.fromParent && db.getSubChannel() === packetObj.channel)) {
      let childCount = db.getChildrenCount();
      if(childCount == 2) {
        // children saturated, random pick child to forward to
        util.getRandomNum(0,1).then(pick => {
          let otherPick = 1 - pick;
          let children = packetObj.getChildren();
          // OUTGOING PACKETS
          sendPacketObject(packetObj, children[pick]);
          // TODO FOR LATER
          //packetObj.valid = false;
          //sendPacketObject(packetObj, children[otherPick]);
        });
      } else if(childCount == 1) {
        // SELECTED AS PARENT
        let newNeighbor = JSON.parse(packetObj.data.toString());
        let port = newNeighbor.port;
        let address = newNeighbor.address;
        let newPostFix = 0;

         if(db.getChildrenCount() == 1) {
          newPostFix = 1 - db.getChildren()[0].postFix
          addChild(address, port, address, db.getCommChannel() + newPostFix, newPostFix);
        } else {
          util.getRandomNum(0,1).then(newPostFix => {
            addChild(address, port, address, db.getCommChannel() + newPostFix, newPostFix);
          });
        }
      }
    } else if(packetObj.channel.startsWith(db.getCommChannel())) {
      // Being routed, needs to go further down
      // select applicable child that starts with data.channel
      
      let candidates = db.getChildren();
      let candidate = undefined;
      for(let i = 0; i < candidates.length; i++) {
        if(candidates[i]) {
          candidate = packetObj.channel.startsWith(candidates[i].channel);
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
        // OUTGOING PACKET
        sendPacketObject(packetObj, candidate);
      }

    } else if(!routingData.fromParent) {
      // Packet is 
      //  * not from parent node (going up)
      //  * not destined for sub-channel of this node
      //  * not destined for this nodes channel
      //  * not destined for this nodes subscribed channel
      // Only thing left is to route up

      // OUTGOING PACKET
      sendPacketObject(packetObj, db.getParent());
    } else {
        console.log("ERROR: PROCESSING JOIN PACKET, MISSING CASE");
        console.log("\troutingData: ", JSON.stringify(routingData, null, 2));
        console.log("\tpacketData: ", JSON.stringify(packetObj, null, 2));
        console.log("\n")
    }
  }

  let processLeavePacket = function(packetObj, routingData) {
    if(routingData.fromParent) {
      console.log("PARENT HAS LEFT THE NETWORK, NEED TO REJOIN");
      //propagate down the tree
    } else {
      // Received leave from child, remove from neighbors
      let leaver = db.removeNeighbor(routingData.sender.address);
      // Nothing else needed to be done?
    }
  }

  this.parseMsg = function(message, remote) {
    let routingData = db.getNeighborRoutingData(remote);
    console.log("Received message from ", remote);
    console.log("Routing data is as follows", routingData);

    if(!routingData.sender) {
      // Here we could receive the join message once we have identified we are a candidate parent node after received JOIN
      console.log("WARNING: message from unknown neighbor - ignoring message");
      console.log(remote);
      return;
    }

    if(!validator.receivedMessage(message)) { // just a place holder
      console.log("WARNING: message received failed validation - ignoring message");
      return;
    }

    let packetObj = packetHandler.parsePacket(message);

    if(packetObj.packetType == "SYN"){
      processSynPacket(packetObj, routingData);
   /* } else if (packetObj.packetType == "DATA") {
      processDataPacket(packetObj, routingData);*/
    } else if (packetObj.packetType == "JOIN") {
      processJoinPacket(packetObj, routingData);
    } else if (packetObj.packetType == "LEAVE") {
      processLeavePacket(packetObj, routingData);
    }
  }

  this.sendJoinMsg = function(channel, port, address) {
    let data = {
      address: address,
      port: port,
      valid: true
    };

    let packetObj = {
      packetType: "JOIN",
      channel: channel,
      data: Buffer.from(JSON.stringify(data))
    };
    processJoinPacket(packetObj, {fromParent: false});
  }

  let leaveNetwork = function() {
    // Leave msg sent from a child to parent to remove them from neighbors.
    // Leave msg sent from parent to children to notify them to leave
    let packetObj = {
      packetType: "LEAVE",
      channel: db.getCommChannel(),
      data: Buffer.from("")
    };

    if(db.getParent()) {
      sendPacketObject(packetObj, db.getParent());
    }
    processLeavePacket(packetObj, {fromParent: true});
  }

  this.sendMsg = function(message, receiverKey, channel) {
    // Expecting the message to be a object
    let packetObj = {
      packetType: "SYN",
      channel: channel,
      data: Buffer.from(JSON.stringify(message))
    };

    let candidates = getCandidates(db.getNeighbors(), channel);

    for(var i = 0; i < candidates.length; i++) {
      sendPacketObject(packetObj, candidates[i]);
    }
  }

  let parseMsg = this.parseMsg;
  let serverListening = false;

  this.destroy = function() {
    // stop listener
  }

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
            parseMsg(message, remote);
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