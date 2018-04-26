var P5 = require('../index');

var opts = {
  sendPort:3001,
  receivePort:3000,
  joinPort:4000
};

P5.create(["p5-topology.herokuapp.com"], opts).then(p5server => {
  var server = p5server;

  console.log("Got your server.");
  console.log("This is your public key: ", server.key);
  console.log("This is your channel:", server.channel);

  server.on("message", (msg) => {
    console.log("Message Received\n");
    console.log(msg);
  });

  server.start();
}).catch(err => {
  console.log("Could not create server...");
  console.log(err);
});