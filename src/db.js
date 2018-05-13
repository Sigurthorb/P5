let util = require("./util");

module.exports = function(){
	let data = {
    topologyServers:[],
    parent: undefined, // parent node
    neighbors: [], // all nodes (duplicated for faster processing)
    children: [], // children nodes
    channel: "",
    position: "",
    isRootNode: false,
    symmetricKeys: [],
    asymmetricKeys: undefined,
    potentialChildren: 0
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
    data.sendPort = parseInt(port);
  }

  this.getSendPort = function() {
    return data.sendPort;
  }

  this.setReceivePort = function(port) {
    data.receivePort = parseInt(port);
  }

  this.getReceivePort = function(port) {
    return data.receivePort;
  }

  this.setJoinPort = function(port) {
    data.joinPort = parseInt(port);
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
  this.setParent = function(address, sendPort, receivePort, position, symmetricKey = "SoonToBeGenerated") {
    if(data.parent) {
      let index = data.neighbors.findIndex(n => n.address === data.parent.address && n.receivePort === data.parent.receivePort);
      if(index >= 0)
        data.neighbors.splice(index, 1);
    }
    data.parent = {
      address: address,
      sendPort: sendPort,
      receivePort: receivePort,
      position: position,
      symmetricKey: symmetricKey
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
  
	this.removeChild = function(child) {
    let childIndex = data.children.findIndex(c => c.address === child.address && c.sendPort === child.sendPort);
    let neighborIndex = data.neighbors.findIndex(n => n.address === child.address && n.sendPort === child.sendPort);
    
    if(childIndex >= 0 && neighborIndex >= 0) {
      // Returns removed child
      data.children.splice(childIndex, 1);
      return data.neighbors.splice(neighborIndex, 1);
    }
  };

  this.clearNeightbors = function() {
    data.neighbors = [];
    data.children = [];
    data.parent = null;
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
  /************************** CHILD ***************************/
  // Child spots are reserved while waiting on response/error from addChild request
  this.addPotentialChild = function() {
    data.potentialChildren++;
  }
  
  this.removePotentialChild = function() {
    if(data.potentialChildren > 0) {
      data.potentialChildren--;
    }
  };

  this.getPotentialChildren = function() {
    return data.potentialChildren;
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
  this.setChannelAsymmetricKeys = function(keys) {
    data.asymmetricKeys = {
      publicKey: keys.publicKey,
      privateKey: keys.privateKey
    };
  };

  this.getPrivateKey = function() {
    return data.asymmetricKeys.privateKey;
  }

  this.getPublicKey = function() {
    return data.asymmetricKeys.publicKey;
  }

  this.addSymmetricKey = function(key) {
    if(data.symmetricKeys.indexOf(key) === -1) {
      data.symmetricKeys.push(key);
    }
  };

  this.getSymmetricKeys = function() {
    return data.symmetricKeys;
  }

  this.removeSymmetricKey = function(key) {
    let index = data.symmetricKeys.indexOf(key);

    if(index >= 0) {
      data.symmetricKeys.splice(index, 1);
    }
  };
};

/************************* HELPERS **************************/

let isSenderEqual = function(candidate, sender) {
  return candidate.address === sender.address && candidate.sendPort === sender.port; // sender is remote object
}