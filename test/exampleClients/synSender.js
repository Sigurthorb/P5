var P5 = require('../../index');
var util = require("../../src/util");
var opts = {
  sendPort:3015,
  receivePort:3016,
  joinPort:4007
};

let pub = "-----BEGIN PUBLIC KEY-----\n\
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA3rjfCrJoNPx94WEUul+Y\n\
z6+9ys1do0afmMWJWlfzGR/qmlqw3E1JyCQYSQxlSQ78eCvP6MGrs4E/QrRp6rPp\n\
EXhUyyFCpQs4jDHOJoDD+7TSsa6e8g6MIHHP4bCy7WgMaItS1Azh18HKOwVf476P\n\
hIBBsDO4sND3QOSE8bMWH2Im32xxMHDy0JuGDN8nxeHPmh/Eu1asaqpmqTP+cto8\n\
TyoO/6Jn/FsetzdTiBeEN0Z79ybUN2RZLPaqtUmx8g6sMbo6HdHmCMfffRA7wkfa\n\
XCVCLRLoLEGGrYhTFfHKLAyQ/PTZS0EPUX6moHyeQY7aZnRhlqqzPnJpKc0kJzcf\n\
9QIDAQAB\n\
-----END PUBLIC KEY-----";

let channel = "000";

let symmetricKey = "keythatis32chara";

let data = util.getRandomBytes(720);
data = new Buffer("TTTESTING");
P5.join("192.168.1.8", 4000, 0, 1, opts).then(p5server => {
  var server = p5server;

  console.log("Got your server.");
  console.log("This is your public key: ", server.key);
  console.log("This is your channel:", server.channel);

  server.on("synMessage", (msg) => {
    console.log("Syn message Received\n");
    console.log(msg);
  });

  server.on("dataMessage", (msg) => {
    console.log("Data message Received\n");
    console.log(msg);
  });

  server.start();
  setTimeout(function() {
    console.log("SENDING");
    server.sendSynMsg(pub, data, {channel: channel, symmetricKey: symmetricKey});
  }, 3000);

}).catch(err => {
  console.log("Could not create server...");
  console.log(err);
});