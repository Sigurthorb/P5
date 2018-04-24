let DB = require("../../src/db");
let Router = require("../../src/communication/router");

let db = new DB();

db.setStartupAsRoot();
db.setReceivePort(3333);
db.setSendPort(3334);
db.setChannel("");



let router = new Router(db, function(packet) {

});

let join1 = {
  publicKey: "test",
  address: "192.168.1.8",
  sendPort: 3336,
  receivePort: 3335
};

let join2 = {
  publicKey: "test",
  address: "192.168.1.8",
  sendPort: 3338,
  receivePort: 3337
};

setTimeout(function() {
  console.log("sending join1");
  router.sendJoinMsg("192.168.1.8", 3335, "");
  setTimeout(function() {
    console.log("sending join2");
    router.sendJoinMsg("192.168.1.8", 3337, "");
  }, 1000);
}, 2000);


setTimeout(function() {
  console.log("now")
  router.sendMsg("Hello", "", "");
}, 10000)