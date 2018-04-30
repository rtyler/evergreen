/*
 * The Periodic module is responsible for holding onto periodic tasks which
 * must be executed regularly
 *
 */

const logger = require('winston');
const cron   = require('cron');

class Periodic {
  /*
   * Requires the feathersjs app instance on initialization
   */
  constructor (app, options) {
    this.app = app;
    this.options = options || {};
    this.jobs = {};
    this.offset = this.computeOffset();
    logger.info('Periodic using minute offset of', this.offset);
  }

  runHourly(name, callback) {
    logger.info(`Registering periodic hourly task: ${name}`);
    let schedule = `${this.offset} * * * *`;
    let job = new cron.CronJob(schedule, callback);
    job.start();
    this.jobs[name] = job;
    return !!(this.jobs[name]);
  }

  /*
   * Compute an instance specific minute offset for running hourly tasks in a
   * way that doesn't cause every client to check in at the same time
   *
   * @return Number between 0-59
   */
  computeOffset() {
    return Math.floor(Math.random() * 59);
  }
}

module.exports = function(app, options) { return new Periodic(app, options); };
module.exports.Periodic = Periodic;
