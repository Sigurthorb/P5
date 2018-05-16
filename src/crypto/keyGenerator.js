const pem = require("pem");
const rsa = require("node-rsa");
const crypto = require("crypto");
const config = require("../config.json");
const secureRandomString = require('secure-random-string');

let generateSymmetricKey = function() {
  return secureRandomString({length: 16});
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

let generateServerCertificates = function() {
  return new Promise(function(resolve, reject) {
    pem.createCertificate({days: 365, selfSigned: true}, function(err, keys) {
      if(err) {
        reject();
      } else {
        resolve(keys);
      }
    })
  });
}

let convertKeyToBinary = function(key){
  let publicKey = new rsa(key);
  return pub.keyPair.n.toBuffer(true).readUInt32LE(2).toString(2).padStart(32,0);
}

module.exports = {
  generateSymmetricKey,
  generateKeyPair,
  convertKeyToBinary,
  generateServerCertificates
};