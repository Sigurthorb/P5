var P5 = require('../index');

var opts = {
  sendPort:3040,
  receivePort:3041,
  joinPort:4016
};

P5.join("172.18.0.2", 3001, 2, 4, opts).then(p5server => {
  var server = p5server;

  console.log("Got your server.");
  console.log("This is your public key: ", server.key);
  console.log("This is your channel:", server.channel);

  server.on("message", (msg) => {
    console.log("Message Received\n");
    console.log(msg);
  });

  server.start();

  setTimeout(function() {
    server.stop();
  }, 6000);

}).catch(err => {
  console.log("Could not create server...");
  console.log(err);
});