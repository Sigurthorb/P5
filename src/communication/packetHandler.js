// Currently expecting BigEndian as that is  'network byte order'

let Parser = require("binary-parser-encoder").Parser;

var PacketParser = new Parser()
  .endianess("big")
  .bit2("packetType", {
    formatter: function(type) {
      if(type === 0) {
        return "DATA";
      } else if (type === 1) {
        return "SYN";
      } else if (type === 2) {
        return "JOIN";
      } else if (type === 3) {
        return "LEAVE";
      }
    }, 
    encoder: function(type) {
      if(type === "DATA") {
        return 0
      } else if (type === "SYN") {
        return 1
      } else if (type === "JOIN") {
        return 2
      } else if (type === "LEAVE") {
        return 3
      }
    }
  })
  .uint32("channel", {
    formatter: function(channelInt) {
      return channelInt.toString(2).padStart(32,0);
    },
    encoder: function(channelString) {
      // Expecting channelString will be written left to right
      // 0 will be padded on the back
      return parseInt(channelString.padEnd(32,0), 2);

    }
  })
  .bit6("bitmask")
  .buffer("data", {
    "readUntil": "eof"
  });

let parsePacket = function(buff) {
  let data = PacketParser.parse(buff);
  data.channel = data.channel.slice(0, data.bitmask);
  return data;
}

/*
 * CreatePacket Data structure:
 * {
 *   packetType: {"DATA", "SYN", "JOIN", "LEAVE"}
 *   channel: "010101010101010101",
 *   bitmask: 6, [if not set, defaults to channel length] (optional)
 *   data: data as a buffer
 * }
 * 
*/

let createPacket = function(data) { // Need to allocate memory for the final size buffer;
  if(!data.bitmask) 
    data.bitmast = data.channel.length;
  let packet = PacketParser.encode(data);
  return packet;
}

module.exports = {
  parsePacket: parsePacket,
  createPacket: createPacket
};