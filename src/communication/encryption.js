
let ursa = require("ursa");
// Thoughts: Could make neighbors share a symmetric key for join and leave messages.

module.exports = function() {
  let storage = {
    symmetric: {},
    asymmetric: {}
  };

  let addSymKey = function(key, name) {
    storage.symmetric[name] = key;
  }

  let addAsymKey = function(privateKey, publicKey, name) {
    storage.asymmetric[name] = {
      pub: ursa.createPublicKey(publicKey),
      priv: ursa.createPrivateKey(privateKey)
    };
  };

  let encryptDataPacket = function(packet, name) {

  }

  let decryptDataPacket = function(packet) {

  }

  let encryptSynPacket = function(packet, name) {
    let keys = storage.asymmetric[name];
    if(!keys) {
      console.log("ERROR: No asymmetric key with name '" + name + "'");
      return;
    }
    packet.data = keys.pub.encrypt(packet.data, "base64", "utf8");

    return packet;
  }

  let decryptSynPacket = function(packet) {
    let output = "";

    let indexes = Object.keys(storage.asymmetric);
    for(let i = 0; i < indexes.length; i++) {
      let keys = storage.asymmetric[indexes[i]];
      output = keys.pub.decrypt(packet.data, "base64", "utf8");

      if(output !== "") {
        // I think this is the output for correct keys
        packet.data = output;
        break;
      }
    }
    //              true if packet is for us
    return [packet, output !== ""];

  }
  
  return {
    addSymKey: addSymKey,
    addPkiKeys: addPkiKeys,
    routerFunctions: {
      encryptDataPacket: encryptDataPacket,
      decryptDataPacket: decryptDataPacket,
      encryptSynPacket: encryptSynPacket,
      decryptSynPacket: decryptSynPacket
    }
  }
}