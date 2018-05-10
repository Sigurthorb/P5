var P5 = require('../../index');

var opts = {
  sendPort:3002,
  receivePort:3003,
  joinPort:4001
};
let address = "10.104.220.62"
P5.join(address, 4000, 0, 4, opts).then(p5server => {
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

  setTimeout(function(){
    server.stop();
    
  }, 8000);

}).catch(err => {
  console.log("Could not create server...");
  console.log(err);
});