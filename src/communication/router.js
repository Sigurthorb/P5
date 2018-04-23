// router
var dgram = require('dgram');
let externalIp = require('public-ip');
let internalIp = require('internal-ip');
let packetHandler = require("./packetHandler");
let validator = require("../validator");
let util = require("../util");

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
  client.bind(db.getSendPort());

  let send = function(host, port, message) {
    client.send(message, 0, message.length, port, host, function(err) {
      console.log('UDP message sent to ' + host +':'+ port);
      if(err) console.log("SocketSendError: " + err);
    });
  };

  let sendPacketObject = function(packetObj, destNeighbor) {
    let packet = packetHandler.createPacket(packetObj);
    send(destNeighbor.address, destNeighbor.receivePort, packet);
  }

  let sendJoinInviteToCandidateNode = function(candidate) {
    let nodeInfo = {
      commChannel: candidate.channel,
      parentInfo: {
        channel: db.getCommChannel(),
        address: db.getAddress(),
        sendPort: db.getSendPort(),
        receivePort: db.getReceivePort()
      }
    }

    send(candidate.address, candidate.receivePort, Buffer.from(JSON.stringify(nodeInfo)));
  }

  let getCandidates = function(lst, channel) {
    let candidates = getCandidatesToSendTo(lst, channel);

    if(candidates.length === 0) {
      // Only enters here if message is going out of nodes channel
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


  /*
  Thoughts:
  * If there is no node that represents a channel, a node cannot join that channel
       * Simplifies joining
  

  */

  let processJoinPacket = function(packetObj, routingData) {
    if(packetObj.channel === db.getCommChannel() || (routingData.fromParent && db.getSubChannel() === packetObj.channel)) {
      if(db.getNeighborsCount() > 2) {
        // children saturated, random pick child to forward to
        util.getRandomNum(0,1).then(num => {
          let nextCandidate = packetObj.getNeighbors[num + 1];
          // OUTGOING PACKET
          sendPacketObject(packetObj, nextCandidate);
        }).catch(err => {
          console.log("ERROR RAND NUM: ", err);
        });
      } else {
        // Need to talk about this scenario.
        // How do we acctually add him, do we ping him and wait for a message?
        // Do we send him which is the join? This is the current approach
        // Can add new neighbor
        let newNeighbor = JSON.parse(packetObj.data.toString());
        let publicKey = newNeighbor.publicKey; // for later
        let sendPort = newNeighbor.sendPort;
        let receivePort = newNeighbor.receivePort; // this will need to be the same at joining and after joining
        let address = newNeighbor.address;
  
        db.addNeighbor(address, sendPort, receivePort).then((newNeighbor) => {
          sendJoinInviteToCandidateNode(newNeighbor);
          console.log("AddedNeighbor");
          console.log(JSON.stringify(newNeighbor,null, 2));
        }).catch(err => {
          console.log("ERROR: Adding neightbor failure - ", err);
        });
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

  /*
    Data has the following structure
    {
      publicKey: string // not used for now
      address: string
      sendPort: number
      receivePort: number
    }
  */
  this.sendJoinMsg = function(channel, data) {
    let packetObj = {
      packetType: "JOIN",
      channel: channel,
      data: Buffer.from(JSON.stringify(data))
    };
    processJoinPacket(packetObj, {fromParent: false});
  }

  this.leaveNetwork = function() {
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

  let waitForJoin = !db.isRoot();
  let parseMsg = this.parseMsg;

  	//Get the public and local ip's before starting the listener
	externalIp.v4().then(publicIp => {
    internalIp.v4().then(localIp => {
      let listener = dgram.createSocket('udp4');
      console.log("Your public IP address is '" + publicIp + "'");
      console.log("Your local IP address is '" + localIp + "'");
      console.log("Make sure to route UDP port '" + db.getReceivePort() + "' to your local IP address");
      console.log("\n\n");
      
      //self.db.setAddress(publicIp);
      db.setAddress(localIp);
  
      listener.on("listening", function() {
        let address = listener.address();
        console.log('\tUDP Server listening on ' + address.address + ":" + address.port + "\n\n");
      });
  
      //Incoming message from another node 
      listener.on("message", function(message, remote) {
        console.log("message");
        console.log(message);
        if(waitForJoin) {
          let invite = JSON.parse(message.toString());
          console.log("GOT INVITE");
          console.log(invite);

          // TEMP TEST CODE:::
          setTimeout(function(){
            messageCb("Joined");
          },3000);

          let parent = invite.parentInfo;
          db.setParent(parent.address, parent.sendPort, parent.receivePort, parent.channel);
          db.setCommChannel(invite.commChannel);
          waitForJoin = false;
          return;
        }
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