
console.log("Started as " + (process.env.ROOT_NODE == "TRUE" ? "ROOT": "NON_ROOT"));
let timer = process.env.WAIT_CONN;

let slep = parseInt(timer) * 1000;
setTimeout(function() {
    console.log("Now starting after " + timer + "sek wait");
}, slep);