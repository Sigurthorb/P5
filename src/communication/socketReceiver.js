let externalIp = require('public-ip');
let internalIp = require('internal-ip');
var dgram = require('dgram');
var server = dgram.createSocket('udp4');

let listen = function(port, messageCb) {
  externalIp.v4().then(publicIp => {
    internalIp.v4().then(localIp => {
      console.log("Your public IP address is '" + publicIp + "'");
      console.log("Your local IP address is '" + localIp + "'");
      console.log("Make sure to route UDP port '" + port + "' to your local IP address");
      console.log("\n\n");
  
      server.on("listening", function() {
        var address = server.address();
        console.log('\tUDP Server listening on ' + address.address + ":" + address.port + "\n\n");
      });
  
      server.on("message", function(buff, remote) {
        let data = {
          senderAddress: remote.address,
          senderPort: remote.port,
          buff: buff
        };
        
        messageCb(null, data);
      });
  
      server.on("error", function(err) {
        console.log("socket server error: ", err.message, "\nerr:", err);
        messageCb(err);
      });
  
      server.bind(port, localIp);
    });
  });
};

module.exports = listen;