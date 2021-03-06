var P5 = require('../../index');

var opts = {
  sendPort:3007,
  receivePort:3008,
  joinPort:4003
};

P5.join("192.168.1.8", 4000, 0, 4, opts).then(p5server => {
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

}).catch(err => {
  console.log("Could not create server...");
  console.log(err);
});