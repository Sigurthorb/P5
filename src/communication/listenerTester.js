
// config
let PORT = 33333;

// This should probably return 2 functions. one to listen and one to close.
let listener = require("./listener.js");

listener(PORT, function newMessage(err, data) {
  if(err) {
    console.log("ERROR: " + err.message);
    console.log(err);
    console.log("\n");
  } else if (data) {
    console.log("New Message::")
    data.message = data.message.toString();
    console.log(JSON.stringify(data, null, 2));
    console.log("\n\n");
  } else {
    // Connection has been closed
  }
})