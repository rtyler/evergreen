/**
* The error telemetry module handles sending error logging to the backend.
*
* NOTE: we _might_ want in the future to have only one Telemetry class and
* handle both error and "metrics" telemetry, but let's start with a smaller
* scope at least for now.
*/
const Tail   = require('tail').Tail;
const fs     = require('fs');
const logger = require('winston');

class ErrorTelemetry {
  constructor(app, options) {
    this.app = app;
  }

  async setup() {
    logger.info('Setting up error logging...');
    var loggingFile = this.fileToWatch();

    // FIXME: this is wrong, we should probably /just/ retry, but handling this an error
    // BTW, we should define a way to also report critical errors like those to the backend
    // The logging file being absent, or some critical parts being wrong on the Jenkins instance,
    // basically nothing should never make the client crash I think
    // (if a connection is established, sure)
    if(!fs.existsSync(loggingFile)) {
      throw new Error('logging file ' + loggingFile + ' not found. ')
    }

    const tail = new Tail(loggingFile, {
      fromBeginning: true
    });

    logger.info('Blah...');

    tail.on("line", function(data) {
      const json = JSON.parse(data);

      const text = "MESSAGE="+json.message+"; //, date="+new Date(json.timestamp) +'\n';
      fs.appendFile("/tmp/test", text, function(err) {
        if(err) {
            return console.log(err);
        }
        console.log("The file was written!" + data);
      });
    });

    tail.on("error", function(error) {
      console.log('ERROR: ', error);
    });
  }

  fileToWatch() {
    var path = '';
    if(!process.env.ESSENTIALS_LOG_FILE) {
      logger.debug("Defaulting to essentials.log.0");
      path = '/evergreen/jenkins/var/logs/';
    } else {
      path = process.env.ESSENTIALS_LOG_FILE;
    }
    logger.info('Watching file: '+ path);
    return path;
  }
}

module.exports = ErrorTelemetry
