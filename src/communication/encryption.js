let ursa = require("ursa");
let util = require("../util");

module.exports = function(db) {

  this.encryptAsymmetric = function(packet, key) {

  }

  this.decryptAsymmetric = function(buffer, checksum) {
    return buffer, true;
  }

  this.decryptSymmetricWithChecksum = function(buffer, checksum) {
    return buffer, "symmetricKey";
  }

  this.decryptSymmetricWithKey = function(buffer, key) {
    return buffer
  }

  this.encryptSymmetric = function(buffer, key) {
    return buffer
  }

  this.encryptSynPacket = function(packet, key) {
    let keys = storage.asymmetric[name];
    if(!keys) {
      console.log("ERROR: No asymmetric key with name '" + name + "'");
      return;
    }
    packet.data = keys.pub.encrypt(packet.data, "base64", "utf8");

    return packet;
  }

  this.decryptSynPacket = function(packet) {
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
}