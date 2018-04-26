var P5 = require('../index');

var opts = {
  sendPort:3002,
  receivePort:3003,
  joinPort:4001
};

P5.join("127.0.0.1", 4000, 0, 1, opts).then(p5server => {
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

  }, 5000);

}).catch(err => {
  console.log("Could not create server...");
  console.log(err);
});