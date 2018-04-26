let { PacketParser, MessageParser } = require("./parsers");

let createPacketBuffer = function(data) {
  data.bitmast = data.channel.length;
  let packet = PacketParser.encode(data);
  return packet;
}

let parsePacketBuffer = function(buff) {
  let data = PacketParser.parse(buff);
  data.channel = data.channel.slice(0, data.bitmask);
  return data;
}

// Takes in encrypted data and the checksum of the decrypted data
let createMessageBuffer = function(packetBuffer, checksum) {
  let obj = {
    packet: packetBuffer,
    checksum: checksum
  };
  console.log(obj);
  let buffer = MessageParser.encode(obj);
  return buffer;
}

let parseMessageBuffer = function(buff) {
  let data = MessageParser.parse(buff);
  return data;
}

module.exports = {
  createPacketBuffer,
  parsePacketBuffer,
  createMessageBuffer,
  parseMessageBuffer
};