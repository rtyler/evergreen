'use strict';

const crypto = require('crypto');
const fs     = require('fs');
const logger  = require('winston');

class Checksum {
  /*
   * Generate a SHA-256 checksum signature from the provided relative or
   * absolute file path
   *
   * @param {string} Properly formed path to file
   * @return {string} hex-encoded sha256 signature
   */
  static signatureFromFile(filePath) {
    try {
      return crypto.createHash('sha256')
        .update(fs.readFileSync(filePath))
        .digest('hex');
    } catch (err) {
      if (err.code == 'ENOENT') {
        logger.error('The file path does not exist and cannot provide a signature', filePath);
        return null;
      }
      throw err;
    }
  }
}

module.exports = Checksum;
