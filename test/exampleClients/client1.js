var P5 = require('../../index');


var opts = {
  sendPort:4010,
  receivePort:4011,
  joinPort:4012
};

P5.join("192.168.1.8", 3001, 0, 15, opts).then(p5server => {
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

  /*function send() {
    console.log("SENDING");
    server.sendSynMsg(pub, data, {channel: channel, symmetricKey: symmetricKey});
    setTimeout(function() {
      send();
    }, 2000);
}*//*
  setTimeout(function(){
    send();
  }, 3000);*/

}).catch(err => {
  console.log("Could not create server...");
  console.log(err);
});