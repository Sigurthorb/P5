let thorIP = "108.56.212.133";
let thorPort = 33333;

let sg = require("./senderGenerator");

let senderInstance = sg(thorIP, thorPort);

module.exports = senderInstance;

// Code below usefull for test, recommend using node console if you want interactive
/*
senderInstance.send("1. Howdy");

senderInstance.send("2. This is a message");

senderInstance.send("3. This is another message");

setTimeout(function() {
  senderInstance.close();
}, 1000);
*/
