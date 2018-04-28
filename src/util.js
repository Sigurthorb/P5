let randomNumber = require("random-number-csprng");
let ADLER32 = require("adler-32");

// Both values are inclusive - promise
let getRandomNum = function(low, high) {
    return randomNumber(low, high);
}

let getChecksum = function(buffer) {
  let checksum = ADLER32.buf(buffer);
  return checksum;
}

let verifyChecksum = function(buffer, checksum) {
  return getChecksum(buffer) === checksum;
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
	topologyArr.filter(ch => ch[0] === key.slice(0, ch[0].length));
	
	//Loop over every channel
	for(let i=0;i<topologyArr.length;i++){
		//Try to match security params (efficiency will be met by picking the smallest that matches security)
		if(topologyArr[i][1] > min) {
			return topologyArr[i][0];
		}
	}

	//Return root if nothing else works
	return "";
}

module.exports = {
  getRandomNum: getRandomNum,
  getChecksum: getChecksum,
  verifyChecksum: verifyChecksum,
  pickChannel: pickChannel
}