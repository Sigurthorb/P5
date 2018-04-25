let { PacketParser, MessageParser } = require("./packetParser");

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
let createMessageBuffer = function(data, checksum) {
  let obj = {
    data: data,
    checksum: checksum
  };
  let dataBuffer = MessageParser.encode(obj);
}

let parseMessageBuffer = function(buff) {
  let data = MessageParser.parse(buff);
  return data;
}

module.exports = {
  parsePacket: parsePacket,
  createPacket: createPacket
};