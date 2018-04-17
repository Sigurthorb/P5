// Currently expecting BigEndian as that is  'network byte order'

var Parser = require("binary-parser").Parser;

var HeaderParser = new Parser()
  .endianess("big")
  .bit2("packetType", {
    formatter: function(type) {
      if(type === 0) {
        return "DATA";
      } else if (type === 1) {
        return "SYN";
      } else if (type === 2) {
        return "JOIN";
      } else {
        return "LEAVE";
      }
    }
  })
  .uint32("channel")
  .bit6("bitmask");
  // skip header padding for now

let parsePacket = function(buff) {
  return HeaderParser.parse(buff);
}

let parseData = function(data) {
  return HeaderParser.encode(data);
}

module.exports = {
  parsePacket: parsePacket,
  parseData: parseData
};

console.log(parseData(parsePacket(Buffer.from("B11000111100", "hex"))));