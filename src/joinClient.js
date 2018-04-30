const axios = require('axios');

exports.getTopologyServers = function(srcIp, srcPort){
	//TO DO Use the first for now, but try different server in the future, if the first one fails
	return axios.get('http://' + srcIp + ':' + srcPort + '/getTopologyServers')
	  .then(response => {
	  	return response.data;
	  })
	  .catch(error => {
	    console.error(error);
	  });		
};

exports.joinNetwork = function(srcIp, srcPort, channel, joinPort){
	//TO DO Use the first for now, but try different server in the future, if the first one fails
	return axios.post('http://' + srcIp + ':' + srcPort + '/requestToJoin', { channel:channel, port:joinPort })
	.then(response => {
	  	return response.data;
	  })
	.catch(error => {
	    console.error(error);
	});
};

exports.addChild = function(srcIp, srcPort, position, sendPort, receivePort, key){
	console.log("Add Child Request Sent...");
	//Thor will encrypt this using openSSl somehow
	let params = {
		position: position,
		sendPort: sendPort,
		receivePort:receivePort,
		symmetricKey:key
	};

	return axios.post('http://' + srcIp + ':' + srcPort + '/parentingRequest', params)
	.then(response => {
		console.log(response.data);
	  	return response.data;
	  })
	.catch(error => {
	    console.error(error);
	});
};

