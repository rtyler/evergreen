jest.mock('fs');

const Downloader = require('../src/lib/downloader');

describe('the Downloader class', () => {
  describe('download()', () => {
    let item = 'https://jenkins.io';
    let dir  = '/tmp';

    it('should return  promise', () => {
      let response = Downloader.download(item, dir);
      expect(Promise.resolve(response)).toBe(response);
    });
  });
});
