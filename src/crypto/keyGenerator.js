const pem = require("pem");
const crypto = require("crypto");
const config = require("../config.json");

let generateSymmetricKey = function() {
  //return crypto.randomBytes(32).toString("utf8");// this key is to long because string is 8 bit but base64 is 6 bit
  return "thisistherightlengthofkeyforencr";
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
  return binaryKey;
}

module.exports = {
  generateSymmetricKey: generateSymmetricKey,
  generateKeyPair: generateKeyPair,
  convertKeyToBinary: convertKeyToBinary,
};