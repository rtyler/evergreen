
const logger    = require('winston');
const Raven     = require('raven');


/**
 * The sentry module is responsible for passing messages along to
 * the sentry.io server.
 */
class Sentry {
  /**
   * Initializes the Sentry library with the URL to connect to.  This must be called at App startup.
   *
   * @param {string} sentryUrl
   */
  constructor(sentryUrl) {
    if (!sentryUrl) {
      logger.error('No sentry url defined.');
      return;
    }
    this.raven = new Raven.Client();
    this.raven.config(sentryUrl);
  }

  /**
   * Send the JSON output to Sentry.io.  JSON format is from the Error Telemetry API.
   * @param {json} data
   */
  sendOutput(data) {
    if (!data) {
      logger.error('Missing data.');
      return;
    }

    const errorData = {
      level: data.log.level.toLowerCase(),
      logger: data.log.name,
      user: {
        id: data.uuid,
      },
      extra: {
        uuid: data.uuid,
        source: data.log,
        flavor: data.flavor,
      },
    };

    if (data.log.exception) {
      this.raven.captureException(new Error(data.log.message), errorData);
    } else {
      this.raven.captureMessage(data.log.message, errorData);
    }
  }
}

module.exports = Sentry;
