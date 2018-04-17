let db = {
	topologyServers:[],
	neighbors:[]
};

module.exports.db = function(){
	self = this;

	let self.data = {
		topologyServers:[]
	};

	this.getTopologyServers = function(){
		return db.topologyServers;
	};

	this.setTopologyServers = function(newServers){
		db.topologyServers = newServers;
	};

	this.addTopologyServer = function(newServer){
		db.topologyServers.push(newServer);
	};

	this.addNeighbor = function(newNeighbor){
		db.neighbors.push(newNeighbor);
	};

	//TO DO Implement
	this.removeNeighbor = function(neighborIp){
		
	};

	this.getNetworkId = function(){
		return db.networkId;
	};

	this.setNetworkId = function(id){
		db.networkId = id;
	};

	this.getKeys = function(){
		return db.keys;
	};

	this.setKeys = function(keys){
		db.keys = keys;
	};

	this.getPorts = function(){
		return db.ports;
	};

	this.setPorts = function(ports){
		db.ports = ports;
	};

};