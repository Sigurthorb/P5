let util = require("./util");

module.exports = function(){
	let data = {
    topologyServers:[],
    parent: undefined, // parent node
    neighbors: [], // all nodes (duplicated for faster processing)
    children: [], // children nodes
    channels: {
      communication: "",
      subscribed: "",
      routing: []
    }
	};
  /************************* TOPOLOGY *************************/
  /*
    topology datastructure:
    {
      address: "192.168.0.1",
      port: 3543
    }
  */
	this.getTopologyServers = function(){
		return data.topologyServers;
	};

	this.setTopologyServers = function(newServers){
		data.topologyServers = newServers;
	};

	this.addTopologyServer = function(address, port){
    let server = {
      address: address,
      port: port
    };
		data.topologyServers.push(server);
  };

  /************************* NETWORK **************************/

  this.setNetworkId = function(id){
		data.networkId = id;
  };
  
	this.getNetworkId = function(){
		return data.networkId;
  };
  
  this.setSendPort = function(port) {
    data.sendPort = port;
  }

  this.getSendPort = function() {
    return data.sendPort;
  }

  this.setReceivePort = function(port) {
    data.receivePort = port;
  }

  this.getReceivePort = function(port) {
    return data.receivePort;
  }

  this.setAddress = function(ip) {
    data.address = ip;
  }

  this.getAddress = function() {
    return data.address;
  }

  /************************* NEIGHBORS **************************/
  // sendPort is the port this neighbor sends from
  // receivePort is the port this neighbor receives on

  // Parent is parent node
  // Children are children node
  // Neighbors are all nodes
  this.setParent = function(address, sendPort, receivePort, channel) {
    if(data.parent) {
      let index = data.neighbors.map(n => n.address).indexOf(data.parent.address);
      if(index >= 0)
        data.neighbors.splice(index, 1);
    }
    data.parent = {
      address: address,
      sendPort: sendPort,
      receivePort: receivePort,
      channel: channel
    };

    data.neighbors.push(data.parent);
  }

  this.getNeighbors = function() {
    return data.neighbors;
  } 

  this.getChildren = function() {
    return data.children;
  }

  this.getParent = function() {
    return data.parent;
  }

	this.addNeighbor = function(address, sendPort, receivePort) {

    return new Promise(resolve, reject => {
      let newNeighbor = {
        address: address,
        channel: data.getCommChannel(),
        sendPort: sendPort,
        receivePort: receivePort
      };

      if(data.children.length === 0) {
        // No neighbors, randomizing its channel
        util.getRandomNum(0,1).then(num => {
          newNeighbor.channel += num;
          data.neighbors.push(newNeighbor);
          data.children.push(newNeighbor);
          resolve(newNeighbor);
        });
      } else if(data.children.length == 1) {
        // One neighbor, assigning different channel that child
        if(data.children[0].channel[data.children[0].channel.length - 1] === "0") {
          newNeighbor.channel += "1";
        } else {
          newNeighbor.channel += "0";
        }
        data.neighbors.push(newNeighbor);
        data.children.push(newNeighbor);
        resolve(newNeighbor);
      } else {
        // What To DO?
        // should not happen from the router
        reject();
      }
    });
  };
  
	this.removeChild = function(neighborIp) {
    let childIndex = data.children.map(n => n.address).indexOf(neighborIp);
    let neighborIndex = data.neighbors.map(n => n.address).indexOf(neighborIp);
    
    if(childIndex >= 0) {
      // Returns removed neighbor
      data.children.splice(childIndex, 1);
      return data.neighbors.splice(index, 1);
    }
  };

  this.getNeighborRoutingData = function(sender) {
    let result = {
      candidates: []
    }

    if(isSenderEqual(data.parent, sender)) {
      result.sender = data.parent;
      reuslt.fromParent = true;
    } else {
      result.candidates.push(data.parent);
      reuslt.fromParent = false;
    }

    for(let i = 0; i < data.children.length; i++) {
      if(!isSenderEqual(data.children[i], sender)) {
        result.candidates.push(data.children[i]);
      } else {
        result.sender = data.children[i];
      }
    }

    return result;
  }

  /************************* CHANNEL **************************/
  this.setCommChannel = function(communicationChannel) {
    data.channels.communication = communicationChannel;
  }

  this.getCommChannel = function() {
    return data.channels.communication;
  }

  this.setSubChannel = function(subscribedChannel) {
    data.channels.subscribed = subscribedChannel;
  }

  this.getSubChannel = function() {
    return data.channels.subscribed;
  }
  /************************ ENCRYPTION ************************/
	this.getKeys = function(){
		return data.keys;
	};

	this.setKeys = function(keys){
		data.keys = keys;
	};
};

/************************* HELPERS **************************/

let isSenderEqual = function(candidate, sender) {
  return candidate.address === sender.address && candidate.sendPort === sender.sendPort;
}