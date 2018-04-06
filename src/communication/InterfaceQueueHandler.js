// keeps array of packets for each ???neighbor???
// initializes random buffers first
// replaces buffers in arrays for buffers that should be sent
// calls sender periodically with a array of buffers to send


//config
let BUFF_SIZE = 1024;
let PERIOD_SEC = 3;
let NUM_BUFF = 1000;

let queueHandlers = [];

let randIndexFunGenerator = function(n) {
    let indexes = Array(n).fill(true);
    return function getRandom() {


      let numbersLeft = indexes.keys();
      let numberIndex = random() * numbersLeft.length; // not secure, need better randomness
      let number = numberLeft[numberIndex];
      
      indexes[number] = undefined;
      return number;
    }
}

// need new name
class InterfaceQueueHandler {

  constructor(sendQueuesCb) {
    this.id = interfaces.length;
    this.sendQueuesCb = sendQueuesCb;
    this.running = false;
    this.incomingPacketQueue = [];
    // this.packetQueue
    this.generateRandomPacketQueue();
  }

  stop() {
    this.running = false;
  }

  start() {
    this.running = true;
  }

  add(packets) {
    // make sure that all queues are of same length
    this.realDataQueue = this.realDataQueue.concat(packets);
  }

  generateRandomPacketQueue() {
    this.packetQueue = [];
    //todo, generate random queues of length NUM_BUFF
    //make sure they are padded
  }

  insertRealPackets() {
    if(this.incomingDataQueue.length == 0) {
      return;
    }

    let toAddToQueue = [];
    if(this.incomingDataQueue > NUM_BUFF) {
      toAddToQueue = this.incomingDataQueue.slice(0,this.NUM_BUFF);
    } else {
      toAddToQueue = this.incomingDataQueue;
      this.incomingDataQueue = [];
    }

    let randIndexGen = randIndexFunGenerator(this.packetQueue.length);

    for(var i = 0; i < toAddToQueue.length; i++) {
      var packet = toAddToQueue[i];
      let index = randIndexGen();
      this.packetQueue[index] = packet;
    }
  }

  EPOC() {
    if(this.running) {
      // get buffers from the realDataQueue
      // insert into packetQueue randomly
      this.insertRealPackets();
      this.sendPacketCb(this.packetQueue);
      this.generatePacketQueuey();
    }
    setTimeout(this.EPOC, PERIOD_SEC*1000)   ; 
  }
}

let addPackets = function(id){
  return function (packets) {
    queueHandlers[id].add(packets);
  };
};

let stop = function(id) {
  return function() {
    queueHandlers[id].stop;
  };
};

let start = function(id) {
  return function () {
    queueHandlers[id].start;
  };
};

let addBufferHandler = function(sendBuffersCb) {
  let handler = new InterfaceBufferHandler(sendBuffersCb);
  bufferHandlers.push(handler);

  return {
    addPackets: addPackets(handler.id),
    start: start(handler.id),
    stop: stop(handler.id)
  };
};

module.exports = addBufferHandler;