// router

let user = {
  "ip": "",
  "port": "",
  "channel": ""
};

// takes care of decrypting packages
// takes care of routing packages to correct neighbors

 /*
 * Buffer size = 1024 bytes
 * Current expected buffer structure: 
 * [inclusive]
 * bit 1 - 2      PacketType(00: DATA, 01: SYN, 10: JOIN, 11: LEAVE) 2 bits
 * bit 3 - 34     channel b unsigned int - bit format 32 bits
 * bit 35 - 40    bitmask lenght  m int 6 bits
 * bit 41 - 81    Headder Padding;
 * bit 82 - 8192  OTHER DATA
 */

 /*
 * SYN packet OTHER DATA - 
 *  First chunk: encrypted will be 512 bits
 *    symmetric key  - 256 bits
 *    sender channel - 32 bit
 *    sender bitmask - 6 bits
 *    checksum       - 16 bits
 *    message:       - x bits
 *    - padding of messages
 */

 /*
 * DATA packet OTHER DATA
 *    - message
 * 
 * 
 * 
 */

/*
 * JOIN packet OTHER DATA
 *   candidate: ""
 * 
 * 
 */

// candidate parent receiveves the join packet
// takes the ip address and sends a message to the child.
// if not in neighbors .. we know that it is a new connection.

// create a generic public key that can be used during joining.
 /*{
   "position": ""
   "bitmask": "",
 }*/

 // Join Packet
 // SYN packet