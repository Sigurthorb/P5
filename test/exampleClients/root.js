var P5 = require('../../index');

var opts = {
  sendPort:3000,
  receivePort:3001,
  joinPort:4000
};

P5.create(["p5-topology.herokuapp.com"], opts).then(p5server => {
  var server = p5server;

  console.log("Got your server.");
  console.log("This is your public key: ", server.key);
  console.log("This is your channel:", server.channel);

  server.on("synMessage", (msg) => {
    console.log("Syn message Received\n");
    console.log(msg.data.toString());
  });

  server.on("dataMessage", (msg) => {
    console.log("Data message Received\n");
    console.log(msg.data.toString());
  });

  server.start();

  server.addSymmetricKey("keythatis32chara");


}).catch(err => {
  console.log("Could not create server...");
  console.log(err);
});