var P5 = require('../index');

let isRoot = process.env.ROOT_NODE === "TRUE";
let waitTime = parseInt(process.env.WAIT_CONN);
// todo, security params

// todo, https://docs.docker.com/compose/startup-order/

var opts = {
  sendPort:parseInt(process.env.SEND_PORT),
  receivePort:parseInt(process.env.RECEIVE_PORT),
  joinPort:parseInt(process.env.JOIN_PORT)
};

console.log("Starting as " + (process.env.ROOT_NODE == "TRUE" ? "ROOT": "NON_ROOT") + " in " + waitTime + " seconds");
console.log("With the ops: " + JSON.stringify(opts));

setTimeout(function() {
    if(isRoot) {
      startRoot();
    } else {
      startClient();
    }
}, waitTime*1000);

let startRoot = function() {
  P5.create(["p5-topology.herokuapp.com"], opts).then(p5server => {
    var server = p5server;
  
    console.log("Got your server.");
    console.log("This is your public key: ", server.key);
    console.log("This is your channel:", server.channel);
  
    server.on("message", (msg) => {
      console.log("Message Received\n");
      console.log(msg);
    });
  
    server.start();
  }).catch(err => {
    console.log("Could not create server...");
    console.log(err);
  });
};



let startClient = function() {
  P5.join("p5-root", 3001, 0, 100, opts).then(p5server => {
    var server = p5server;
  
    console.log("Got your server.");
    console.log("This is your public key: ", server.key);
    console.log("This is your channel:", server.channel);
  
    server.on("message", (msg) => {
      console.log("Message Received\n");
      console.log(msg);
    });
  
    server.start();
  
  }).catch(err => {
    console.log("Could not create server...");
    console.log(err);
  });
}