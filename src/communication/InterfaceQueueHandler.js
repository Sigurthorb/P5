// keeps array of packets for each ???neighbor???
// initializes random buffers first
// replaces buffers in arrays for buffers that should be sent
// calls sender periodically with a array of buffers to send


//config
let BUFF_SIZE = 1024;
let PERIOD_SEC = 3;
let NUM_BUFF = 1000;

let QueueHandlers = [];

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
    this.enabled = true;
    this.incomingDataQueue = [];
    this.queue = [];
    this.generateRandomQueue();
  }

  disable() {
    this.enabled = false;
  }

  enable() {
    this.enabled = true;
  }

  add(data) {
    // make sure that all queues are of same length
    this.realDataQueue = this.queue.concat(data);
  }

  generateRandomQueue() {
    this.queue = [];
    //todo, generate random queues of length NUM_BUFF
    //make sure they are padded
  }

  insertRealData() {
    if(this.incomingDataQueue.length == 0) {
      return;
    }

    let queues = [];
    if(this.incomingDataQueue > NUM_BUFF) {
      queues = this.incomingDataQueue.slice(0,this.NUM_BUFF);
    } else {
      queues = this.incomingDataQueue;
      this.incomingDataQueue = [];
    }

    let randIndexGen = randIndexFunGenerator(this.bufferArray.length);

    for(var i = 0; i < buffers.length; i++) {
      var buff = buffers[i];
      let index = randIndexGen();
      this.bufferArray[index] = buff;
    }
  }

  generatorLoop() {
    if(this.enabled) {
      // get buffers from the realDataQueue
      // insert into bufferArray randomly
      this.insertRealData();
      this.sendBuffersCb(this.bufferArray);
      this.generateBufferArray();
    }
    setTimeout(this.sendLoop, PERIOD_SEC*1000)    
  }
}

let add = function(id){
  return function (data) {
    interfaces[id].add(data);
  };
};

let disable = function(id) {
  return function() {
    interfaces[id].disable;
  };
};

let enable = function(id) {
  return function () {
    interface[id].enable;
  };
};

let addBufferHandler = function(sendBuffersCb) {
  let handler = new InterfaceBufferHandler(sendBuffersCb);
  bufferHandlers.push(handler);
  return {
    add: add(handler.id),
    enable: enable(handler.id),
    disable: disable(handler.id)
  } 
}

module.exports = addBufferHandler;