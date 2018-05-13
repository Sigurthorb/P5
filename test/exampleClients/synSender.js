var P5 = require('../../index');

var opts = {
  sendPort:3015,
  receivePort:3016,
  joinPort:4007
};

let pub = "-----BEGIN PUBLIC KEY-----\n\
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxrP3U2z3lrhnhS2xwMUU\n\
wBtjLZhwc5e50MwdObZWsGU7peTRyliJjTzGb6+pYXYv3YUvmp6nFewfS2qjsZ/8\n\
bhRrHAYtaFAhwFjJF3fJPgodOn7VrXJaAT/xmAryPQ0hxbE1QVk+r2R1Ay8K/9eA\n\
PYAJbfsDBW5FS3VYkpUNV+lKR73U3InCGE9LW06gE00ejpKzSvi5zPHRx1WKyYxZ\n\
QUhW0CqdcnlFHl66cYfIc3hELrWapqwYGGMxymCRY4etpbkgK3to82cHSS1nD4mg\n\
kyqS76BKl08u8+wzSZLY+98tCnHh/WLYJG1l48DCC3aUJ7CdYbeKpMfJPAe2wlIj\n\
XQIDAQAB\n\
-----END PUBLIC KEY-----";

let channel = "";

let symmetricKey = "thisisasymmetrickeythatis32chara";

let data = Buffer.from("TestingTesting");

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