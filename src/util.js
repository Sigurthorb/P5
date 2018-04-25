let randomNumber = require("random-number-csprng");
let ADLER32 = require("adler-32");

let encodeChannelToBuff = function(str) {
  
}

let decodeChannelToInt = function(buff) {
  
}

// Both values are inclusive
let getRandomNum = function(low, high) {
    return randomNumber(low, high);
}

let getChecksum = function(buffer) {
  return ADLER32.buff(buffer);
}

let verifyChecksum = function(buffer, checksum) {
  return getChecksum(buffer) === checksum;
}

module.exports = {
  getRandomNum: getRandomNum,
  getChecksum: getChecksum,
  verifyChecksum: verifyChecksum
};