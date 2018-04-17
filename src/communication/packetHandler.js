var Parser = require("binary-parser").Parser;

var HeaderParser = new Parser()
  .endianess("big")
  .bit2("packetType") // int rep
  .uint32("channel")
  .bit6("bitmask"); // does not support uint6
  /*.array("headerPadding", {
    type: ""                            skipping for now
  })*/
  // .choice() Can be used to select packetType string

let parsePacket = function(buff) {
  console.log(buff.toString("hex"))
  console.log(HeaderParser.parse(buff));
}

let parseData = function(data) {
  
}

module.exports = {
  parsePacket: parsePacket,
  parseData: parseData
};

parsePacket(Buffer.from("F11000111100", "hex"));