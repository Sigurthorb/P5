let randomNumber = require("random-number-csprng");

let encodeChannelToBuff = function(str) {

}

let decodeChannelToInt = function(buff) {
  
}

// Both values are inclusive
let getRandomNum = function(low, high) {
  return Promise.try(function() {
    return randomNumber(low, high);
  });
}

module.exports = {
  getRandomNum: getRandomNum
};