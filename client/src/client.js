/*
 * This is the main entrypoint for the evergreen-client
 */

const feathers     = require('@feathersjs/feathers');
const fetch        = require('node-fetch');
const logger       = require('winston');
const rest         = require('@feathersjs/rest-client');

const createCron     = require('./lib/periodic');
const Registration   = require('./lib/registration');
const Status         = require('./lib/status');
const ErrorTelemetry = require('./lib/error-telemetry');
const Update         = require('./lib/update');

const Downloader     = require('./lib/downloader');

/*
 * The Client class is a simple wrapper meant to start the basics of the client
 * and then run a simple runloop to block the client from ever exiting
 */
class Client {
  constructor() {
    this.app = feathers();
    this.reg = new Registration(this.app);
    this.status = new Status(this.app);
    this.update = new Update(this.app);
    this.errorTelemetry = new ErrorTelemetry(this.app);
  }

  statusAndUpdate() {
    this.status.create().then(() => {
      logger.info('Status created, checking for updates');
      this.update.query().then((ups) => {
        if (ups) {
          logger.info('Updates available', ups);
          ups.plugins.updates.forEach((plugin) => {
            logger.info('Fetching ', plugin.url);
            Downloader.download(plugin.url).then(() => {
              logger.info('download complete');
            });
          });
        }
      });
    });
  }

  runloop(app, token) {
    logger.info('..starting runloop');
    /*
     * Only setting on the cron once we have registered and logged in,
     * otherwise it's not really useful to have anything running periodically
     */
    const cron = createCron(app);

    this.status.authenticate(this.reg.uuid, token);
    this.update.authenticate(this.reg.uuid, token);

    this.statusAndUpdate();

    cron.runHourly('post-status', () => {
      this.status.create();
    });
    cron.runDaily('check-for-updates', () => {
      this.statusAndUpdate();
    });

    setInterval( () => {
      /* no-op to keep this process alive */
    }, 10);
  }

  bootstrap() {
    const endpoint = this.removeTrailingSlashes(process.env.EVERGREEN_ENDPOINT);
    const restClient = rest(endpoint);

    logger.info('Configuring the client to use the endpoint %s', endpoint);
    this.app.configure(restClient.fetch(fetch));

    // FIXME: move this into runloop once we figure out how to run it locally during testing
    try {
      this.errorTelemetry.setup();
    }
    catch (err) {
      logger.error('Failed to set up Error Telemetry', err);
    }
    // END FIXME

    this.reg.register().then((res) => {
      logger.debug('Registration returned', res);
      /*
       * It is only valid to start the runloop assuming we have been able to
       * register and log in successfully, otherwise the client will exit and
       * supervisord should try again :/
       */
      this.runloop(this.app, this.reg.token);
    });
  }

  removeTrailingSlashes(string) {
    while(string.endsWith('/')) {
      string = string.substring(0, string.length-1);
    }
    return string;
  }

}

module.exports = Client;

if (require.main === module) {
  /* Main entrypoint for module */
  logger.info('Starting the evergreen-client..');
  let client = new Client();
  client.bootstrap();
}
