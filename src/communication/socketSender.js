let dgram = require('dgram');
let client = dgram.createSocket('udp4');

let send = function(host, port, message) {
  client.send(message, 0, message.length, port, host, function(err) {
    console.log('UDP message sent to ' + host +':'+ port);
    if(err) console.log("SocketSendError: " + err);
  });
};

let close = function() {
  client.close();
}

module.exports = {
  send: send,
  close: close
};