// config
let MESSAGE_SIZE_LEN = 1024;

let receivedMessage = function(buff) {
  
  return true;
  // return buff.byteLength() === MESSAGE_SIZE_LEN;
}

let verifySymmetricKey = function(symmetricKey) {
  return true;
}

module.exports = {
  receivedMessage: receivedMessage,
  verifySymmetricKey: verifySymmetricKey
}