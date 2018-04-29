const { createLogger, format, transports } = require('winston');
const config = require("./config.json");

let userTransports = [
  new transports.Console({
    level: config.logger.consoleLevel,
    silent: !config.logger.logToConsole
  })
];

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
  logger.log.apply(logger, arguments);
}