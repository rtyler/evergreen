jest.mock('fs');

const assert  = require('assert');
const path    = require('path');
const storage = require('../src/lib/storage');

describe('The storage module', () => {
  describe('homeDirectory()', () => {
    it('should return a path', () => {
      const p = storage.homeDirectory();
      assert(p != path.basename(p), 'This doesn\'t look like a path');
    });
  });
});
