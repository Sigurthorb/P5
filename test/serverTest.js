let p5 = require("../src/server");

let opts = {
  sendPort: 3333,
  receivePort: 3334,
  root: true,
  keys: {}
}

let server = new p5(opts);

server.start();


opts.sendPort = 3331;
opts.receivePort = 3332;
opts.root = false;

let testCli1 = new p5();
testCli1.start();