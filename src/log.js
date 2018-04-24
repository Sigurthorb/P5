const { createLogger, format, transports } = require('winston');
console.log(format);
let config = require("./config.json");

let userTransports = [];

if(config.logger.logToConsole) {
  userTransports.push(new transports.Console({
    level: config.logger.consoleLevel
  }))
}

if(config.logger.logToFile) {
  userTransports.push(new transports.File({
    filename: config.logger.logFile,
    level: config.logger.logFileLevel
  }));
}

const logger = createLogger({
  format: format.combine(
    format.splat(),
    format.timestamp(),
    format.simple()
  ),
  transports: userTransports
});

module.exports = function() {
  logger.log.apply(this, arguments);
}