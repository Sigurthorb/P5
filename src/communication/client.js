

let send = function(commId, data) {
  // send data to a initialized communication channel
}

let initComm = function(publicKey, cb) {
  // Initialize communication
  // send symmetric key
  // wait until ack received
  // call callback with commId
}

let receiverCb;
module.exports = function(_receiverCb) {

  receiverCb = _receiverCb;

  return {
    send: send,
    intiComm: initComm 
  }
}