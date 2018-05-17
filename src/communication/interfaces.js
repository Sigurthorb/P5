const util = require("../util");
const parser = require("./parser/packetParser");
const encryption = new (require("./encryption"))({});
//config

const QUEUE_LEN = 1
const POOL_SIZE = QUEUE_LEN*4;
const MAX_INPUT_QUEUE_SIZE = QUEUE_LEN*2;
const PERIOD_MSEC = 2000

let randomPacketPool = function() {
  this.pool = [];
  //1020
  this.getPacket = function() {
    if(this.pool.length === 0) {
      for(let i = 0; i < POOL_SIZE; i++) {
        this.pool.push(util.getRandomBytes(1024)); // should be 1004, rest is IV and checksum
      }
    }
    return this.pool.pop();
  }
}(); // userlater


let randIndexFunGenerator = function(n) {
  let numbersLeft = Array.apply(null, {length: n}).map(Number.call, Number);
  return function getRandom() {
    return numbersLeft.splice(Math.floor(Math.random() * numbersLeft.length),1)[0];
  }
}

let Interface = function(neighbor, sendQueuesCb) {
  this.sendPacketCb = sendQueuesCb;
  this.running = false;
  this.incomingPacketQueue = [];
  this.neighbor = neighbor;

  this.stop = function() {
    this.running = false;
  }

  this.start = function() {
    if(!this.running) {
      this.running = true;
      this.generateRandomPacketQueue();
      this.EPOC();
    }
  }

  this.generateRandomPacketQueue = function() {
    this.packetQueue = [];
    for(let i = 0; i < QUEUE_LEN; i++) {
      this.packetQueue.push(util.getRandomBytes(1004));
    }
  }

  this.add = function(packet) {
    if(this.incomingPacketQueue.length < MAX_INPUT_QUEUE_SIZE) {
      this.incomingPacketQueue.push(packet);
    }
  }

  this.insertRealPackets = function() {

    let toAddToQueue = [];
    if(this.incomingPacketQueue > QUEUE_LEN) {
      toAddToQueue = this.incomingPacketQueue.splice(0, QUEUE_LEN);
    } else {
      toAddToQueue = this.incomingPacketQueue;
      this.incomingPacketQueue = [];
    }

    let randIndexGen = randIndexFunGenerator(this.packetQueue.length);

    for(var i = 0; i < toAddToQueue.length; i++) {
      var packet = toAddToQueue[i];
      let index = randIndexGen();
      let obj = {
        checksum: util.getChecksum(packet),
        packet: encryption.encryptSymmetric(packet, this.neighbor.symmetricKey)
      }
      this.packetQueue[index] = parser.createMessageBuffer(obj);
    }

    for(var i = toAddToQueue.length; i < QUEUE_LEN; i++) {
      let index = randIndexGen();
      // encrypt with key and generate random checksum
      let obj = {
        checksum: util.getRandomBytes(4),
        packet: encryption.encryptSymmetric(this.packetQueue[index], this.neighbor.symmetricKey)
      };
      this.packetQueue[index] = parser.createMessageBuffer(obj);
    }
    delete randIndexGen;
  }

  this.EPOC = function() {
    if(this.running) {
      // get buffers from the realDataQueue
      // insert into packetQueue randomly
      this.insertRealPackets();
      this.sendPacketCb(this.packetQueue, this.neighbor);
      this.generateRandomPacketQueue();
      let self = this;
      setTimeout(function(){self.EPOC()}, PERIOD_MSEC);
    }
  }
}

module.exports = function InterfaceHandler(client) {
  let interfaces = [];

  let sendPackets = function(packets, neighbor) {
    for(let i = 0; i < packets.length; i++) {
      client.send(packets[i], 0, 1024, neighbor.receivePort, neighbor.address, function(err) {
        if(err) {
          console.log("error", "Failed to send message to %s:%d, error:%s", neighbor.address, neighbor.receivePort, err.message);
        }
        console.log(neighbor)
      });
    }
  }

  this.addInterface = function(neighbor) {
    let newInterface = new Interface(neighbor, sendPackets);
    interfaces.push(newInterface);
    newInterface.start();
  }

  this.removeInterface = function(neighbor) {
    let index = interfaces.findIndex(intface => intface.neighbor.position === neighbor.position);
    if(index > -1) {
      let face = interfaces[index];
      face.stop();
    }
  }

  this.closeAllInterfaces = function(neigbors) {
    let num = interfaces.length;

    for(let i = 0; i < num; i++) {
      let intface = interfaces.pop();
      intface.stop();
    }
  }

  this.addToQueue = function(packet, neighbor) {
    let index = interfaces.findIndex(intface => intface.neighbor.position === neighbor.position);
    if(index > -1) {
      interfaces[index].stop();
      interfaces.splice(index);
    }
  }

  this.addToMultipleQueues = function(packet, neigbors) {
    for(let i = 0; i < neigbors.length; i++) {
      this.addToQueue(packet, neighbors[i]);
    }
  }

  
  this.sendPacketSync = function(packet, neighbors) {
    return new Promise((resolve, reject) => {
      if(neighbors.length === 0) {
        resolve();
        return;
      }

      let messageObj = {
        checksum: util.getChecksum(packet)
      };

      let returned = 0;
      for(let i = 0; i < neighbors.length; i++) {
        messageObj.packet = encryption.encryptSymmetric(packet, neighbors[i].symmetricKey);
        let message = parser.createMessageBuffer(messageObj);
        let address = neighbors[i].address;
        let port = neighbors[i].receivePort;
        
        console.log("MESSAGELEN: ", message.byteLength);
        client.send(message, 0, message.length, port, address, function(err) {
          returned++;
          if(err) {
            log("error", "Failed to send message to %s:%d, error:%s", address, port, err.message, err);
          }

          if(returned === neighbors.length) {
            resolve();
          }
        });
      }
    });
  };

}

/*
neighbor1 = {symmetricKey: "1111111111111111", position: 1};
neighbor2 = {symmetricKey: "2222222222222222", position: 2};
neighbor3 = {symmetricKey: "3333333333333333", position: 3};
neighbor4 = {symmetricKey: "4444444444444444", position: 4};

let i = 0;
let start = new Date();
let intFaceHand = new InterfaceHandler(function(packet, neighbor) {
  console.log("i: %d, time: %dms", ++i, new Date() - start);
});

intFaceHand.addInterface(neighbor1);
intFaceHand.addInterface(neighbor2);
intFaceHand.addInterface(neighbor3);
intFaceHand.addInterface(neighbor4);

setTimeout(function() {
}, 4000);

setTimeout(function() {
  intFaceHand.removeInterface(neighbor1);
  intFaceHand.removeInterface(neighbor2);
  intFaceHand.removeInterface(neighbor3);
  intFaceHand.removeInterface(neighbor4);
}, 8000);*/
/*
let intface = new Interface({symmetricKey:""}, function(pk) {
  intface.add(util.getRandomBytes(1004));
  console.log("i: %d, time: %dms", ++i, new Date() - start);
});

var start = new Date();
intface.start();*/
/*
let gen = randIndexFunGenerator(10);

for(let i = 0; i < 11; i++) {
  console.log(gen());
}*/