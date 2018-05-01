/*
 * This module is responsible for coordinating the updates with the Update
 * service, see:
 *  https://github.com/jenkinsci/jep/tree/master/jep/307
 */

const logger = require('winston');


class Update {
  constructor(app, options) {
    this.options = options || {};
    this.app = app;
    this.token = null;
    this.uuid = null;
  }

  authenticate(uuid, token) {
    this.uuid = uuid;
    this.token = token;
    return this;
  }

  async query() {
    let api = this.app.service('update');
    return api.find({
      headers: { Authorization: this.token },
      query: {
        level: this.getCurrentLevel(),
      },
    }).then((res) => {
      logger.info('Update.query() => ', res);
    }).catch((err) => {
      logger.error('Update.query() => ', err);
    });
  }

  getCurrentLevel() {
    // TODO: actually store and retrieve the update level :)
    return 0;
  }
}

module.exports = Update;
