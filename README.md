# P5
NPM packet for a P5 node.
This project was created as part of a final project for CMSC 711 with Professor Bobby Bhattacharjee.

### Dependencies
Node version 8.11 or higher & npm
OpenSSL needs to be accessible in path
- Windows users:  http://slproweb.com/products/Win32OpenSSL.html

#### Setup
1 upd port open and forwarded to your computer.
1 tcp port open and forwarded to your computer.


#### Execution

A network can be boostrapped using docker and docker compose.
To run a network with docker, follow these steps:

1. Run `docker build -t p5 .`
2. Edit the docker-compose file to a topology server (Default value a heroku server)
3. Run `docker-compose up`
