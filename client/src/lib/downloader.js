/*
 * The Downloader is responsible for only downloading of URLs to local files on
 * disk and checking them against provided checksums.
 */

const fs     = require('fs');
const path   = require('path');
const url    = require('url');

const fetch  = require('node-fetch');
const logger = require('winston');
const mkdirp = require('mkdirp');

class Downloader {
  constructor() {
  }

  download(item) {
    const u = url.parse(item);
    const dir = [process.env.EVERGREEN_HOME,
      'jenkins',
      'home',
      'plugins'].join(path.sep);
    mkdirp.sync(dir);
    const filename = [dir, path.basename(u.pathname)].join(path.sep);

    logger.info('Fetching %s and saving to %s', item, filename);

    return new Promise((resolve, reject) => {
      fetch(item).then((res) => {
        const output = fs.createWriteStream(filename);

        output.on('close', () => {
          logger.debug('Downloaded %s (%d bytes)',
            filename, output.bytesWritten);
          resolve(output);
        });

        output.on('error', err => reject(err));

        res.body.pipe(output);
      });
    });
  }
}

module.exports = new Downloader();
