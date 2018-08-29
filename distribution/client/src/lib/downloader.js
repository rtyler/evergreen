/*
 * The Downloader is responsible for only downloading of URLs to local files on
 * disk and checking them against provided checksums.
 */

const fs     = require('fs');
const path   = require('path');
const url    = require('url');

const rp      = require('promise-request-retry');
const logger  = require('winston');
const mkdirp  = require('mkdirp');

const Checksum = require('./checksum');
const UI       = require('./ui');

class Downloader {
  constructor() {
  }

  static formatDuration(durationInMs) {
    if (durationInMs < 1000) {
      return `${durationInMs}ms`;
    }
    const seconds = Math.floor(durationInMs / 1000);
    const millisecs = durationInMs - 1000 * seconds;
    return `${seconds}.${millisecs}s`;
  }

  /*
   * Download the specified URL to the directory as the filename
   *
   * @param {string} the full URL
   * @param {string} a full output directory
   * @param {string} the filename to output at
   */
  static download(item, dir, fileNameToWrite) {
    const itemUrl = url.parse(item);
    const itemUrlBaseName = path.basename(itemUrl.pathname);
    if (!itemUrlBaseName) {
      throw new Error(`The URL must end with a non-empty path. E.g. http://jenkins.io/something.html instead of https://jenkins.io/ (received URL=${itemUrl})`);
    }

    mkdirp.sync(dir);
    const filename = [dir, fileNameToWrite].join(path.sep);

    UI.publish(`Fetching ${filename}`);
    logger.info('Fetching %s and saving to %s', item, filename);

    let options = {
      uri: item,
      verboseLogging: true,
      method: 'GET',
      headers: {
        'User-Agent': 'evergreen-client'
      },
      simple: true,
      resolveWithFullResponse: true,
      encoding: null,
      timeout: 120 * 1000,
      retry: 10
    };

    const startTime = Date.now();
    return new Promise( (resolve, reject) => {
      rp(options)
        .then( (response) => {

          const elapsedString = Downloader.formatDuration(Date.now() - startTime);
          logger.info  ('Download complete for', filename, `(Took ${elapsedString})`);
          UI.publish(`Fetched ${filename} in ${elapsedString}s`);

          const output = fs.createWriteStream(filename);

          output.on('close', () => {
            logger.debug('Downloaded %s (%d bytes)',
              filename, output.bytesWritten);
            resolve(output);
          });
          output.write(response.body);
          output.end();
        })
        .catch((err) => {
          logger.error('Error %s occurred while fetching %s and saving to %s', err, item, filename);
          reject(err);
        });
    });
  }
}

module.exports = Downloader;
