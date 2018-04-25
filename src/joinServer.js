const express = require('express');
const bodyParser = require('body-parser');
const EventEmitter = require('events');
const util = require('util');

//This is the contructor
function JoinServer(opts) {
	let self = this;
	let listener = express();
	this.close = listener.close;
  	EventEmitter.call(this);

	listener.use(bodyParser.json()); // support json encoded bodies
	listener.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

	//Sent from Candidate Node to Entry Point Node
	listener.get('/getTopologyServers', function(req, res){
		if(opts.topologyServers && opts.networkId){
			let data = {
				servers:opts.topologyServers,
				netId:opts.networkId
			};

			res.json(data);
		} else {
			res.send("NO TOPOLOGY SERVERS FOUND");
		}
	});

	//Sent from Candidate Node to Entry Point Node
	listener.post('/requestToJoin', function(req, res){
		let data = {
			channel: req.body.channel,
			address: req.connection.remoteAddress,
			port: req.body.port
		};
		console.log("address: ", req.connection.remoteAddress);
		console.log("ch: ", req.body.channel);
		//Broadcast join Request through P5
		self.emit('joinRequest', data);
		res.send("REQUEST BROADCASTED TO P5 NETWORK");		
	});

	//Sent from Parent Node to Candidate Node
	listener.post('/parentingRequest', function(req, res){
		//This is an encoded msg that contains - position, send and receive ports from the parent
		let params = req.body;
		params.address = req.connection.remoteAddress;

		//Emit server creation request
		self.emit('parentRequest', params);

		//Send send/receive ports
	});

	listener.listen(opts.port, '0.0.0.0');
	console.log('Listening at http://localhost:' + opts.port);

};

util.inherits(JoinServer, EventEmitter);

// Export the server
module.exports = JoinServer;