let config = require("../../config.json");
let Parser = require("binary-parser-encoder").Parser;

var MessageParser = new Parser()
  .endianess("big")
  .int32("checksum")
  .buffer("packet", {
    "readUntil": "eof"
  });

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
  .int32("checksum")
  .buffer("data", {
    "readUntil": "eof"
  });

let SynParser = new Parser()
  .endianess("big")
  .string("symmetricKey", {
    length: config.crypto.SymmetricKeySizeBits
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

module.exports = {
  MessageParser,
  PacketParser,
}