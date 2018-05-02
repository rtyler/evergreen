/*
 * The Downloader is responsible for only downloading of URLs to local files on
 * disk and checking them against provided checksums.
 */

const fs     = require('fs');
const path   = require('path');
const url    = require('url');

const fetch  = require('node-fetch');
const logger = require('winston');

class Downloader {
  constructor() {
  }

  download(item) {
    const u = url.parse(item);
    const filename = path.basename(u.pathname);
    logger.info('Fetching %s and saving to %s', item, filename);
    return new Promise((resolve, reject) => {
      fetch(item).then((res) => {
        const output = fs.createWriteStream(filename);
        res.body.pipe(output);
        output.on('close', () => {
          logger.debug('Downloaded %s (%d bytes)',
            filename, output.bytesWritten);
          resolve(output);
        });
        output.on('error', err => reject(err));
      });
    });
  }

}

module.exports = new Downloader();
