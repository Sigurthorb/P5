const https = require("https");
https.globalAgent.options.rejectUnauthorized = false
const axios = require('axios');

exports.getTopologyServers = function(srcIp, srcPort){
  //TO DO Use the first for now, but try different server in the future, if the first one fails
  return axios.get('https://' + srcIp + ':' + srcPort + '/getTopologyServers')
    .then(response => {
      return response.data;
    })
    .catch(error => {
      console.error(error.message);
      return error;
    });
};

exports.joinNetwork = function(srcIp, srcPort, channel, joinPort){
  //TO DO Use the first for now, but try different server in the future, if the first one fails
  return axios.post('https://' + srcIp + ':' + srcPort + '/requestToJoin', { channel:channel, port:joinPort })
  .then(response => {
      return response.data;
    })
  .catch(error => {
    console.error(error.message);
    return error;
  });
};

exports.addChild = function(srcIp, srcPort, position, sendPort, receivePort, key){
  console.log("Add Child Request Sent...");
  let params = {
    position: position,
    sendPort: sendPort,
    receivePort:receivePort,
    symmetricKey:key
  };

  return axios.post('https://' + srcIp + ':' + srcPort + '/parentingRequest', params)
    .then(response => {
      return response.data;
    })
    .catch(error => {
      return error;
    });

};

