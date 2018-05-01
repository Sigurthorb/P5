var P5 = require('../../index');

var opts = {
  sendPort:3015,
  receivePort:3016,
  joinPort:4007
};

let pub = "-----BEGIN PUBLIC KEY-----\n\
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAz+YWB2/XY74zmeAB6Oii\n\
LRQsoHB9SijIOT90ZzGjbpU8kPyCbWoAozF8bSCU3359jq9ZhnHT43MUWMjJzLgi\n\
SM/RckVGHr3T0SIZKvJeaXgRrsyr4G41emlFTxbLSVcyKmTvOXax8gskgxCdKoCT\n\
UuGEziLowxsuS0r+mmNYOmoHAUPIoGAY9DzxIrKZoyn/XnxXkvXkeoEMAhEpVj7B\n\
9jg/RHBaECbO1Web7lGk17l1auV3Z08Jg2VCjpOluEHbEMF2/coe23YeyjTHX3Ra\n\
BJYp478oRm3MIZNqwL8Zr66VSZUOJU7eoKkW0tqX1mwNvdWnT9OWsuuuYZbEVZ4g\n\
HQIDAQAB\n\
-----END PUBLIC KEY-----";

let channel = "00";

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
    server.sendSynMsg(pub,{channel: channel, symmetricKey: symmetricKey, data: data});
  }, 3000);

}).catch(err => {
  console.log("Could not create server...");
  console.log(err);
});