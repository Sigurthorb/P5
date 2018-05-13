const axios = require('axios');

exports.createNetwork = function(servers){
	if(servers.length) {
		//TO DO Use the first for now, but try different server in the future, if the first one fails
		return axios.post('http://' + servers[0] + '/network')
		  .then(response => {
		  	return response.data;
		  });	
	}

};

exports.joinNetwork = function(servers, id, ch){
	if(servers.length) {
		//TO DO Use the first for now, but try different server in the future, if the first one fails
		return axios.post('http://' + servers[0] + '/network/' + id + '/channel/' + ch) 
		  .then(response => {
		  	return response.data;
		  });	
	}

};

exports.getTopology = function(servers, id){
  // ISSUE: servers can be undefined, resulting in a crash
	if(servers.length) {
		//TO DO Use the first for now, but try different server in the future, if the first one fails
		return axios.get('http://' + servers[0] + '/network/' + id)
		  .then(response => {
		  	return response.data;
		  });	
	}

};

exports.leaveNetwork = function(servers, id, ch){
	if(servers.length) {
		console.log('Requesting to leave topology server...');
		console.log(servers, ' ', id, ' ', ch);
		//TO DO Use the first for now, but try different server in the future, if the first one fails
		return axios.delete('http://' + servers[0] + '/network/' + id + '/channel/' + ch) 
		  .then(response => {
		  	console.log('Left topology Server');
		  	return response.statusCode == 200;
		  });	
	}

};


