let randomNumber = require("random-number-csprng");
let ADLER32 = require("adler-32");
let crypto = require("crypto");

// Both values are inclusive - promise
let getRandomNum = function(low, high) {
    return randomNumber(low, high);
}

let getRandomBytes = function(num) {
  // temp thread blocker
  return crypto.randomBytes(num);
}

let fillDataBuff = function(buff) { // 976 bytes
  return Buffer.concat([buff, getRandomBytes(976 - buff.byteLength)], 976);
}

let fillSynJoinDataBuff = function(buff) { // 992 bytes
  return Buffer.concat([buff, getRandomBytes(992 - buff.byteLength)], 992);
}

let getChecksum = function(buffer) {
  let checksum = ADLER32.buf(buffer);
  return checksum;
}

let verifyChecksum = function(buffer, checksum) {
  let correctChecksum = getChecksum(buffer);
  return correctChecksum === checksum;
}

//Decide on a channel based on topology, size and public key
let pickChannel = function(topology, k, min, max) {
	let key = String(k);

	//Convert Object to array [[ch, nodes]]
	topologyArr = [];
	Object.keys(topology).forEach(function(key) {
			topologyArr.push([key, topology[key]]);
	});

	//Sort smallest to biggest
	topologyArr.sort(function (a, b) {
			return  a[1] - b[1];
	});

	//Filter out irrelevant channels
	topologyArr = topologyArr.filter(ch => key.startsWith(ch[0]));
	//Loop over every channel
	for(let i=0;i<topologyArr.length;i++) {
		//Try to match security params (efficiency will be met by picking the smallest that matches security)
		if(topologyArr[i][1] > min) {
			return topologyArr[i][0];
		}
	}

	//Return root if nothing else works
	return "";
}
/****************** DATA SIZES ********************/

let getUserMaxDataBufferSize = function() {
  return 976;
}

let getUserMaxSynDataBufferSize = function() {
  return 193;
}

module.exports = {
  getRandomNum,
  getChecksum,
  verifyChecksum,
  pickChannel,
  getUserMaxDataBufferSize,
  getUserMaxSynDataBufferSize,
  fillDataBuff,
  fillSynJoinDataBuff,
  getRandomBytes
}