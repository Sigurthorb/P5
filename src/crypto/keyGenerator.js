let pem = require("pem")
let crypto = require("crypto");
let config = require("../config.json");

let generateSymmetricKey = function() {
  return crypto.randomBytes(config.crypto.SymmetricKeySizeBytes).toString("base64");
}

let generateKeyPair = function(cb) {
  let keys = {};
  pem.createPrivateKey(config.crypto.PrivateKeySizeBits, function(err, obj) {
    if(err) {
      cb(null, err);
    } else {
      keys.privateKey = obj.key;
      pem.getPublicKey(obj.key, function(err, obj) {
        if(err) {
          cb(null, err);
        } else {
          keys.publicKey = obj.publicKey;
          cb(keys);
        }
      });
    }
  });
}

module.exports = {
  generateSymmetricKey: generateSymmetricKey,
  generateKeyPair: generateKeyPair
};