const assert = require("assert");
const encryption = require("../../src/communication/encryption");


let db = {
  getSymmetricKeys: function(){
    return ["test1", "test2", "test3", "test4", "test5", "test6", "test7", "test8", "test9", "test10"];
  }
}

// Initialized tests

/*
let key = "thiskeyismorethanenoughtthiskey2";
let enc = new mod(db);
let test = Buffer.from("1");
console.log(enc.decryptSymmetricWithKey(enc.encryptSymmetric(test, key), key).toString());

let key = "thiskeyismorethanenoughtthiskey2";
let enc = new mod(db);
let test = Buffer.from("123");
let checksum = util.getChecksum(test);
console.log(enc.decryptSymmetricWithChecksum(enc.encryptSymmetric(test, key), checksum).toString());
*/

/*

let privateKey;

let db = {
  getSymmetricKeys: function(){
    return [
      "thiskeyismorethanenoughtthiskey1",
      "thiskeyismorethanenoughtthiskey2",
      "thiskeyismorethanenoughtthiskey3",
      "thiskeyismorethanenoughtthiskey4",
      "thiskeyismorethanenoughtthiskey5",
      "thiskeyismorethanenoughtthiskey6",
      "thiskeyismorethanenoughtthiskey7",
      "thiskeyismorethanenoughtthiskey8",
      "thiskeyismorethanenoughtthiskey9",
      "thiskeyismorethanenoughtthiske10"
    ];
  }, 
  getPrivateKey: function() { return privateKey}
}


const keyGen = require("../crypto/keyGenerator");
console.log("test");
keyGen.generateKeyPair().then((keys) => {
  privateKey = keys.privateKey;
  console.log(keys);
  let test = Buffer.from("testtest123");
  let checksum = "1/"//util.getChecksum(test);
  let enc = new mod(db);

  console.log(enc.decryptAsymmetric(enc.encryptAsymmetric(test, keys.publicKey), checksum).toString());
}, (err) => {
  console.log("whutt");
  console.log(err);
})
*/