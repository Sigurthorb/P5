let DB = require("../../src/db");
let Router = require("../../src/communication/router");

let db = new DB();

db.setReceivePort(3337);
db.setSendPort(3338);
db.setSubChannel("");

let first = true;


let router = new Router(db, function(packet) {
  console.log("------------------------------------------------");
  console.log("\n\n");
  console.log(packet);
  if(first) {
    router.sendMsg("TEST2222222222222", "", "");
    first = false;
  }
  console.log("\n\n");
});