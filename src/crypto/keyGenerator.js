let pem = require("pem")
let crypto = require("crypto");
let config = require("../config.json");

let generateSymmetricKey = function() {
  return crypto.randomBytes(config.crypto.SymmetricKeySizeBytes).toString("base64");
}

//Returns a promise with the key pair
let generateKeyPair = function() {
  return new Promise(function(resolve, reject) {
    let keys = {};

    pem.createPrivateKey(config.crypto.PrivateKeySizeBits, function(err, obj) {
      if(err) {
        reject(err);
      } else {
        keys.privateKey = obj.key;
        pem.getPublicKey(obj.key, function(err, obj) {
          if(err) {
            reject(err);
          } else {
            keys.publicKey = obj.publicKey;
            resolve(keys);
          }
        });
      }
    });
  });
}

let convertKeyToBinary = function(key){
  key = key.replace("-----BEGIN PUBLIC KEY-----", "").replace("-----END PUBLIC KEY-----", "").replace(/(?:\r\n|\r|\n)/g, "").trim();
  let binaryKey = key.split('').map(c => c.charCodeAt(0).toString(2)).join('');
}

module.exports = {
  generateSymmetricKey: generateSymmetricKey,
  generateKeyPair: generateKeyPair,
  convertKeyToBinary: convertKeyToBinary,
};