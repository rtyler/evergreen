/*
 * This module is responsible for coordinating the updates with the Update
 * service, see:
 *  https://github.com/jenkinsci/jep/tree/master/jep/307
 */

const fs      = require('fs');
const path    = require('path');
const mkdirp  = require('mkdirp');
const logger  = require('winston');

const storage = require('./storage');

class Update {
  constructor(app, options) {
    this.options = options || {};
    this.app = app;
    this.token = null;
    this.uuid = null;
    this.manifest = null;
    this.fileOptions = { encoding: 'utf8' };
  }

  authenticate(uuid, token) {
    this.uuid = uuid;
    this.token = token;
    return this;
  }

  async query() {
    let api = this.app.service('update');
    let self = this;
    return api.find({
      headers: { Authorization: this.token },
      query: {
        level: this.getCurrentLevel(),
      }
    }).then((res) => {
      self.saveUpdateSync();
      return res;
    });
  }

  getCurrentLevel() {
    this.loadUpdateSync();
    if (this.manifest) {
      let level = this.manifest.meta.leve;
      logger.debug('Currently at update level %d', level);
      return level;
    }
    return 0;
  }

  saveUpdateSync(manifest) {
    logger.info('Saving a new manifest..');
    fs.writeFileSync(
      this.updatePath(),
      JSON.stringify(manifest),
      this.fileOptions);
    return true;
  }

  loadUpdateSync() {
    try {
      fs.statSync(this.updatePath());
    }
    catch (err) {
      if (err.code == 'ENOENT') {
        return null;
      }
      else {
        throw err;
      }
    }
    this.manifest = JSON.parse(fs.readFileSync(this.updatePath(),
      this.fileOptions));
    return this.manifest;
  }

  /*
   * Returns a path to the stored information about the current updates levels
   * and other important information
   *
   * @return String
   */
  updatePath() {
    const dir = path.join(storage.homeDirectory(), 'updates.json');

    try {
      fs.statSync(dir);
    }
    catch (err) {
      if (err.code == 'ENOENT') {
        mkdirp.sync(storage.homeDirectory());
      }
      else {
        throw err;
      }
    }
    return dir;
  }
}

module.exports = Update;
