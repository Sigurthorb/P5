let dgram = require('dgram')
module.exports = function(host, port) {
  let client = dgram.createSocket('udp4');

  return function(message/*, cb*/) {
    client.send(message, 0, message.length, port, host, function(err) {
      console.log('UDP message sent to ' + HOST +':'+ PORT);
      if(err) console.log("ERROR: " + err);
      client.close();
      /*if(err) {
        cb(err);
      } else {
        cb();
      }*/
    });
  };
}