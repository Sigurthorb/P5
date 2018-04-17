let ip = "192.168.0.1";
let port = 33444;

let socket = require("./socketSender.js");

module.exports = function(message) {
  socket.send(ip, port, message);
}

// Code below usefull for test, recommend using node console if you want interactive
/*
socket.send(ip, port, "1. Howdy");

socket.send(ip, port, "2. This is a message");

socket.send(ip, port, "3. This is another message");

setTimeout(function() {
  socket.close();
}, 1000);
*/