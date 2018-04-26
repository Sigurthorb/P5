let util = require("./util");

module.exports = function(){
	let data = {
    topologyServers:[],
    parent: undefined, // parent node
    neighbors: [], // all nodes (duplicated for faster processing)
    children: [], // children nodes
    channel: "",
    position: "",
    isRootNode: false
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

  this.setJoinPort = function(port) {
    data.joinPort = port;
  }

  this.getJoinPort = function(port) {
    return data.joinPort;
  }

  this.setAddress = function(ip) {
    data.address = ip;
  }

  this.getAddress = function() {
    return data.address;
  }

  this.setAsRoot = function() {
    data.isRootNode = true;
  }

  this.isRoot = function() {
    return data.isRootNode;
  }

  /************************* NEIGHBORS **************************/
  // sendPort is the port this neighbor sends from
  // receivePort is the port this neighbor receives on

  // Parent is parent node
  // Children are children node
  // Neighbors are all nodes
  this.setParent = function(address, sendPort, receivePort, position) {
    if(data.parent) {
      let index = data.neighbors.map(n => n.address).indexOf(data.parent.address);
      if(index >= 0)
        data.neighbors.splice(index, 1);
    }
    data.parent = {
      address: address,
      sendPort: sendPort,
      receivePort: receivePort,
      position: position
    };

    data.neighbors.push(data.parent);
  }

  this.getNeighbors = function() {
    return data.neighbors;
  }

  this.getChildren = function() {
    return data.children;
  }

  this.getFirstChild = function() {
    return data.children[0];
  }

  this.getChildrenCount = function() {
    return data.children.length;
  }

  this.getParent = function() {
    return data.parent;
  }

	this.addChild = function(address, sendPort, receivePort, position, symmetricKey) {
    let newNeighbor = {
      address: address,
      position: position,
      sendPort: sendPort,
      receivePort: receivePort,
      symmetricKey: symmetricKey
    };

    data.neighbors.push(newNeighbor);
    data.children.push(newNeighbor);
  };
  
	this.removeChild = function(address, sendPort) {
    let childIndex = data.children.findIndex(c => c.address === address && c.sendPort === sendPort);
    let neighborIndex = data.neighbors.findIndex(n => n.address === address && n.sendPort === sendPort);
    
    if(childIndex >= 0 && neighborIndex >= 0) {
      // Returns removed child
      data.children.splice(childIndex, 1);
      return data.neighbors.splice(neighborIndex, 1);
    }
  };

  this.getNeighborRoutingData = function(sender) {
    let result = {
      candidates: [],
      sender: null,
      fromParent: false
    };

    if(data.parent) {
      if(isSenderEqual(data.parent, sender)) {
        result.sender = data.parent;
        result.fromParent = true;
      } else {
        result.candidates.push(data.parent);
        result.fromParent = false;
      }
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
  this.setPosition = function(position) {
    data.position = position;
  }

  this.getPosition = function() {
    return data.position;
  }

  this.setChannel = function(channel) {
    data.channel = channel;
  }

  this.getChannel = function() {
    return data.channel;
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
  return candidate.address === sender.address && candidate.sendPort === sender.port; // sender is remote object
}