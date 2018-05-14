/*
 * The status module is responsible for collecting and reporting the current
 * state of this instance to the Evergreen backend `Status` service
 */

const logger    = require('winston');
const StreamZip = require('node-stream-zip');

class Status {
  constructor(app, options) {
    this.options = options || {};
    this.token = null;
    this.uuid = null;
    this.app = app;
  }

  /*
   * Return the timezone string for this client, e.g. America/Los_Angeles, UTC,
   * etc
   */
  getTimezone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  authenticate(uuid, token) {
    this.uuid = uuid;
    this.token = token;
    return this;
  }

  async create() {
    let api = this.app.service('status');
    let record = {
      uuid: this.uuid,
      timezone: this.getTimezone(),
    };
    return api.create(record, {
      headers: { Authorization: this.token }
    })
      .then((res) => {
        logger.info('Created a Status record with server side ID %d', res.id);
      })
      .catch((err) => {
        /* 400 errors are most likely attempts to recreate the same Status for
         * this instance.
         *
         * We need a better way to run a HEAD request to check before POSTing a
         * new status, but it's unclear whether that's supported in feathersjs
         * or not
         */
        if (err.code != 400) {
          logger.error('Failed to create a Status record', err);
        }
        else {
          logger.debug('Status record not changed');
        }
      });
  }

  async manifestFromZip(zipArchive, options) {
    options = options || {};
    let manifestName = options.manifestName || 'META-INF/MANIFEST.MF';
    let self = this;

    return new Promise((resolve, reject) => {
      const zip = new StreamZip({ file: zipArchive });

      zip.on('ready', () => {
        zip.stream(manifestName, (err, stream) => {
          if (err) { reject(err); }
          let buffer = '';
          stream.on('data', chunk => buffer += chunk );
          stream.on('end', () => {
            zip.close();
            resolve(self.parseRawManifest(buffer));
          });
        });
      });
    });
  }

  /*
   * Convert a MANIFEST.MF type file into an object with keys and values
   *
   * The MANIFEST.MF string is expected to be \r\n separated like a real
   * MANIFEST.MF file
   *
   * @return Object
   */
  parseRawManifest(manifest) {
    let result = {};
    manifest.split('\r\n').forEach((line) => {
      if (line) {
        let parts = line.split(': ');
        result[parts[0]] = parts[1];
      }
    });
    return result;
  }
}

module.exports = Status;
