const fs     = require('fs');
const logger = require('winston');
const path   = require('path');
const mkdirp = require('mkdirp');
const Raven  = require('raven');


const DEFAULT_ERROR_LOGGING_FILE = '/srv/evergreen/error-logging.json';

class ErrorTelemetryService {
  constructor() {
    this.loggingFile = process.env.ERROR_LOGGING_FILE;
    if (!this.loggingFile) {
      logger.warn(`No ERROR_LOGGING_FILE environment variable found, defaulting to ${DEFAULT_ERROR_LOGGING_FILE}`);
      this.loggingFile = DEFAULT_ERROR_LOGGING_FILE;
    }

    const baseDirectory = path.dirname(this.loggingFile);
    if (!fs.existsSync(baseDirectory)) {
      logger.warn(`${baseDirectory} does not exist, trying to create it.`);
      mkdirp(baseDirectory);
    }
    logger.info(`Server: ${baseDirectory} will push received logs to ${this.loggingFile}`);
  }
  create(data) {
    // Should be impossible because it passed the hooks step
    if (!data) {
      return Promise.reject({status:'KO'});
    }

    // FIXME: TBD where, what and how to actually send data
    const toWrite = `${new Date()} => ${JSON.stringify(data)}\n\n`;
    fs.appendFileSync(this.loggingFile, toWrite);
    if (data.log.exception.raw) {
      Raven.captureException(new Error(data.log.message), {
        level: data.log.level.toLowerCase(),
        logger: data.log.name,
        extra: {
          uuid: data.uuid,
          source: data.log
        }
      });
    } else {
      Raven.captureMessage(data.log.message, {
        level: data.log.level.toLowerCase(),
        logger: data.log.name,
        extra: {
          uuid: data.uuid,
          source: data.log
        }
      });
    }

    return Promise.resolve({status:'OK'});
  }
}

module.exports = function() {
  return new ErrorTelemetryService();
};
module.exports.ErrorTelemetryService = ErrorTelemetryService;
