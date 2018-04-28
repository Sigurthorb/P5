let { PacketParser, MessageParser, SynParser } = require("./parsers");

let createPacketBuffer = function(obj) {
  obj.bitmast = obj.channel.length;
  let buff = PacketParser.encode(obj);
  return buff;
}

let parsePacketBuffer = function(buff) {
  let obj = PacketParser.parse(buff);
  obj.channel = obj.channel.slice(0, obj.bitmask);
  return obj;
}

// Takes in encrypted data and the checksum of the decrypted data
let createMessageBuffer = function(obj) {
  let buffer = MessageParser.encode(obj);
  return buffer;
}

let parseMessageBuffer = function(buff) {
  let obj = MessageParser.parse(buff);
  return obj;
}

let createSynBuffer = function(obj) {
  obj.bitmast = obj.channel.length;
  let buff = SynParser.encode(obj);
  return buff
}

let parseSynBuffer = function(buff) {
  let obj = SynParser.parse(buff);
  obj.channel = obj.channel.slice(0, obj.bitmask);
  return obj;
}

module.exports = {
  createPacketBuffer,
  parsePacketBuffer,
  createMessageBuffer,
  parseMessageBuffer
};