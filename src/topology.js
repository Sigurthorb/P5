const axios = require('axios');

exports.createNetwork = function(servers){

	if(servers.length) {
		//TO DO Use the first for now, but try different server in the future, if the first one fails
		return axios.get('http://' + servers[0] + '/network')
		  .then(response => {
		  	return response.data;
		  })
		  .catch(error => {
		    console.error(error);
		  });		
	}

};

exports.joinNetwork;

exports.getTopology;

exports.leaveNetwork;

