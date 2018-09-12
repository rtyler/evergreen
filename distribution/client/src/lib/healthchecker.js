const logger        = require('winston');
const rp            = require('request-promise');// require('promise-request-retry');

const INSTANCE_IDENTITY_URL = '/instance-identity/';
const METRICS_URL           = '/metrics/evergreen/healthcheck';

class HealthChecker {

  constructor(jenkinsRootUrl) {
    this.jenkinsRootUrl = jenkinsRootUrl;
  }

  async check() { // TODO : add options.timeout etc.

    const checks = [];

    checks.push(this.checkInstanceIdentity());
    checks.push(this.checkMetrics());

    return Promise.all(checks)
      .then( () => {
        return {
          healthy: true,
          message: 'All checks were successful. Instance deemed healthy.'
        };
      })
      .catch( error => {
        return {
          healthy: false,
          message: `Something went wrong: ${error}`
        };
      });

  }

  checkInstanceIdentity() {
    // TODO: share (most?) options here
    let options = {
      uri: `${this.jenkinsRootUrl}${INSTANCE_IDENTITY_URL}`,
      verboseLogging: true,
      method: 'GET',
      headers: {
        'User-Agent': 'evergreen-client'
      },
      simple: true,
      resolveWithFullResponse: true,
      encoding: 'utf-8',
      timeout: 3 * 1000,
      retry: 2
    };
    logger.debug('Checking instance identity URL');
    return rp(options)
      .then(response => {
        const body = response.body;
        // simplistic check that we should be on the expected page
        // see https://ci.jenkins.io/instance-identity/ for instance
        if (!( body.indexOf('-----BEGIN PUBLIC KEY-----') > -1 &&
            body.indexOf('-----END PUBLIC KEY-----') > -1)) {
          logger.debug('/instance-identity/ URL OK');
          throw new Error('Could not find the public key in the instance-identity page');
        }
      });
  }

  checkMetrics() {
    let options = {
      uri: `${this.jenkinsRootUrl}${METRICS_URL}`,
      verboseLogging: true,
      method: 'GET',
      headers: {
        'User-Agent': 'evergreen-client'
      },
      json: true,
      simple: true,
      resolveWithFullResponse: true,
      encoding: 'utf-8',
      timeout: 3 * 1000,
      retry: 2
    };

    logger.debug('Checking metrics Evergreen healthchecking URL');
    return rp(options).
      then( response => {
        if (!response.body) {
          throw new Error('No body');
        }
        if (!(response.body instanceof Object)) {
          throw new Error(`Body is not an object! '${response.body}'`);
        }
        if (!response.body['thread-deadlock'].healthy) {
          throw new Error('There is a deadlock!');
        }
        if (!response.body.plugins.healthy) {
          throw new Error(`Plugins are not healthy! '${response.body.plugins.healthy}'`);
        }
        logger.debug(`metrics healthchecking endpoint: everything looks fine: ${JSON.stringify(response.body)}`);
      });
  }
}

module.exports = HealthChecker;
