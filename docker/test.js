var dgram = require('dgram');
let client = dgram.createSocket('udp4');

client.bind(13123);

let message = Buffer.from("test");
client.send(message, 0, message.length, 3005, "192.168.1.8", function(err) { console.log(err); })