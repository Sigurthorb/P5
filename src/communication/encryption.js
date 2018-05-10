const config = require("../config.json");
const util = require("../util");
const crypto = require("crypto");
const log = require("../log");

const symmetricAlgorithm = "aes-256-ctr";

module.exports = function(db) {
  // TODO ADD PADDING for packet not only block

  // try catch should be around usage of this function
  this.encryptAsymmetric = function(buffer, publicKey) {
    // Support encryption of 215 bytes because of padding, result is 256 bytes
    let encrypted = crypto.publicEncrypt(publicKey, buffer);
    return encrypted;
  }

  this.decryptAsymmetric = function(buffer, checksum) {
    let privateKey = db.getPrivateKey();
    try {
      let decrypted = crypto.privateDecrypt(privateKey, buffer);
      // not required since error thrown for wrong private keys but adds integrity
      if(util.verifyChecksum(decrypted, checksum)) { 
        return decrypted;
      }
    } catch (err) {
      //Packet not destined for this node.
      return;
    }
  }

  this.decryptSymmetricWithChecksum = function(buffer, checksum) {
    try {
      let keys = db.getSymmetricKeys();
      let IV = buffer.slice(0, 16);
      buffer = buffer.slice(16);

      for(let i = 0; i < keys.length; i++) {
        console.log((new Buffer(keys[i])).byteLength)
        let decipher = crypto.createDecipheriv(symmetricAlgorithm, new Buffer(keys[i]), IV);
        let decrypted = Buffer.concat([decipher.update(buffer), decipher.final()]);

        if(util.verifyChecksum(decrypted, checksum)) {
          return [decrypted, keys[i]];
        }
      }
      return [];
    } catch (err) {
      log("error", "Failed to decrypt symmetric with checksum with error: %s", err.message, err);
      return [];
    }
  }

  this.decryptSymmetricWithKey = function(buffer, key) {
    try {
      let IV = buffer.slice(0, 16);
      buffer = buffer.slice(16);
      console.log((new Buffer(key)).byteLength)
      let decipher = crypto.createDecipheriv(symmetricAlgorithm, new Buffer(key), IV);
      let decryptedBuffers = [];

      decryptedBuffers.push(decipher.update(buffer));
      decryptedBuffers.push(decipher.final())

      return Buffer.concat(decryptedBuffers);
    } catch(err) {
      log("error", "Failed to decrypt symmetric with key with error: %s", err.message, err);
      return Buffer.from("");
    }
  }

  this.encryptSymmetric = function(buffer, key) {
    try {
      let IV = crypto.randomBytes(16);
      console.log((new Buffer(key)).byteLength)
      let cipher = crypto.createCipheriv(symmetricAlgorithm, new Buffer(key), IV);

      let encryptedBuffers = [IV];
      encryptedBuffers.push(cipher.update(buffer));
      encryptedBuffers.push(cipher.final());

      return Buffer.concat(encryptedBuffers);
    } catch(err) {
      log("error", "Failed to encrypt symmetric with error: %s", err.message, err);
    }
  }
}