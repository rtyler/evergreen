jest.mock('fs');

const fs         = require('fs');
const mkdirp     = require('mkdirp');
const Downloader = require('../src/lib/downloader');
const Checksum   = require('../src/lib/checksum');

describe('the Downloader class', () => {
  describe('download()', () => {
    let item = 'https://jenkins.io';
    let dir  = '/tmp';

    beforeEach(() => {
      /* Make sure memfs is flushed every time */
      fs.volume.reset();
      mkdirp.sync(dir);
    });

    it('should return promise', async () => {
      let response = Downloader.download(`${item}/index.html`, dir, 'index.html');
      expect(response instanceof Promise).toBeTruthy();
      await response;

      expect(fs.readFileSync(`${dir}/index.html`)).toBeTruthy();
    });

    it('should fail on url without final basename-ish path', () => {
      expect(() => {
        Promise.resolve(Downloader.download(`${item}/`, dir));
      }
      ).toThrow();
    });

    it('should manage to download a decently big file, retrying if needed', async () => {

      // ace-editor is 5 MB, so it could make tests more flaky and cumbersome with slow connection
      // FIXME: introduce assume() + env var to allow disabling this?
      const toDownload = 'http://updates.jenkins-ci.org/download/plugins/ace-editor/1.1/ace-editor.hpi';
      const sha256 = 'abc97028893c8a71581a5f559ea48e8e1f1a65164faee96dabfed9e95e9abad2';

      jest.setTimeout(50000); // default is 5 seconds, could be bigger because of the file size
      await Downloader.download(toDownload, dir, 'ace-editor.hpi');
      expect(Checksum.signatureFromFile(`${dir}/ace-editor.hpi`)).toEqual(sha256);
    });
  });
});
