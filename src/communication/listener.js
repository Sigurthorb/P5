let externalIp = require('public-ip');
let internalIp = require('internal-ip');
var dgram = require('dgram');
var server = dgram.createSocket('udp4');

// config
let PORT = 33333;

externalIp.v4().then(publicIp => {
  internalIp.v4().then(localIp => {
    console.log("Your public IP address is '" + publicIp + "'");
    console.log("Your local IP address is '" + localIp + "'");
    console.log("Make sure to route UDP port '" + PORT + "' to your local IP address");

    server.on("listening", function(message, remote) {
      var address = server.address();
      console.log('UDP Server listening on ' + address.address + ":" + address.port);
    });

    /*
    * Buffer size = 1024 bytes
    * Current expected buffer structure: 
    * [inclusive]
    * bit 1        SYN flag - 1 if SYN packet
    * bit 2 - 33   channel b unsigned int
    * bit 34 - 39  depth m int
    * bit 40 - 8192 OTHER DATA
    */

    /*
    * SYN packet OTHER DATA
    * First chunk: encrypted bit (forward bit) which determines whether a packet should be forwarded onto some other channel
    * 
    * 
    * 
    * 
    */
   
    /*
    * 
    * 
    * 
    * 
    * 
    */

    server.on("message", function(message, remote) {
      let sender = "'" + remote.address + ":" + remote.port + "'";
      let data = {};
      try {
        data = JSON.parse(message.toString());
        console.log("Successfully parse message from " + sender);
        console.log("Message was:\n" + JSON.stringify(data, null, 2))
      } catch (err) {
        console.log("ERROR: Failed to parse message json from " + sender);
        console.log("Message was:\n" + message.toString());
      }
    });

    server.on("error", function(err) {
      console.log("Listener Error: ", err.message, "\nerr:", err);
    });

    server.on("close", function() {
      console.log("Listener closed");
    });

    server.bind(PORT, localIp);
  })
  
});
