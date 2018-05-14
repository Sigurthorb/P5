let { PacketParser, MessageParser, SynParser, DataParser } = require("./parsers");

let createPacketBuffer = function(obj) {
  obj.bitmask = obj.channel.length;
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
  obj.bitmask = obj.channel.length;
  let buff = SynParser.encode(obj);
  return buff
}

let parseSynBuffer = function(buff) {
  let obj = SynParser.parse(buff);
  obj.channel = obj.channel.slice(0, obj.bitmask);
  return obj;
}

//encode real length into buffer before appending
let createDataBuffer = function(obj) {
  return DataParser.encode(obj);
}

let parseDataBuffer = function(buff) {
  let realLen = buff.readUInt16BE(0);
  return buff.slice(2,realLen+2);
}

module.exports = {
  createPacketBuffer,
  parsePacketBuffer,
  createMessageBuffer,
  parseMessageBuffer,
  createSynBuffer,
  parseSynBuffer,
  createDataBuffer,
  parseDataBuffer
};

const util = require("../../util");
const gen = require("../../crypto/keyGenerator");

//let data = new Buffer("");
/*
obj = {
  symmetricKey: gen.generateSymmetricKey(),
  channel: "10",
  checksum: util.getChecksum(data),
  data: data
};

let buff = createSynBuffer(obj);
*/

/*
let packetObj = {
  packetType: "JOIN",
  channel: "1",
  checksum: util.getChecksum(data),
  data: data
};

let buff = createPacketBuffer(packetObj);
*/
/*
let messageObj = {
  checksum: util.getChecksum(data),
  packet: data
}

let buff = createMessageBuffer(messageObj);
*/

let data = {
  address: "1.3.3.3",
  port: "1"
};

let buff = Buffer.from(JSON.stringify(data));
console.log(buff.byteLength);

/*
packetBuffer is min 10 bytes

synBuffer is min 21 bytes
*/