let dgram = require('dgram');
module.exports = function(host, port) {
  let client = dgram.createSocket('udp4');

  return {
    send: function(message) {
      client.send(message, 0, message.length, port, host, function(err) {
        console.log('UDP message sent to ' + host +':'+ port);
        if(err) console.log("ERROR: " + err);
      });
    },
    close: function() {
      client.close();
    }
  };
};