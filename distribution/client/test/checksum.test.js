'use strict';

jest.mock('fs');

const fs       = require('fs');
const Checksum = require('../src/lib/checksum');

describe('Checksum', () => {
  beforeEach(() => {
    /* Make sure memfs is flushed every time */
    fs.volume.reset();
  });
  describe('signatureFromFile', () => {
    const validFile = '/jest-test';

    beforeEach(() => {
      fs.writeFileSync(validFile, 'hello world');
    });

    it('should return a string', () => {
      expect(Checksum.signatureFromFile(validFile)).toBeTruthy();
    });

    it('should return null for a non-existent file', () => {
      expect(Checksum.signatureFromFile('/tmp/no-way-this-file.ever.exists/i-hope')).toBeFalsy();
    });
  });
});
