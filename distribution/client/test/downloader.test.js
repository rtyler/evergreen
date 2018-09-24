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

      // default is 5 seconds, could be bigger because of the various file sizes and network flakiness
      jest.setTimeout(120000);
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
      }).toThrow();
    });

    describe('with real downloads', () => {

      it('should fail on an invalid signature', async () => {
        try {
          await Downloader.download('https://jenkins.io/index.html',
            dir,
            'index.html',
            'bogus-signature');
          expect(true).toBeFalsy();
        } catch (err) {
          expect(err.message.startsWith('Signature verification')).toBeTruthy();
        }
      });

      it('should manage to download a decently big file, retrying if needed', async () => {
        // ace-editor is 5 MB, so it could make tests more flaky and cumbersome with slow connection
        const toDownload = 'http://updates.jenkins-ci.org/download/plugins/ace-editor/1.1/ace-editor.hpi';
        const sha256 = 'abc97028893c8a71581a5f559ea48e8e1f1a65164faee96dabfed9e95e9abad2';
        await Downloader.download(toDownload, dir, 'ace-editor.hpi');
        expect(Checksum.signatureFromFile(`${dir}/ace-editor.hpi`)).toEqual(sha256);
      });

      it('should not retry too fast on failed download', async () => {
        const toDownload = 'http://nonexisting-url-yada.org/thefile';
        const startTime = new Date();
        try {
          await Downloader.download(toDownload, dir, 'thefile', {retry: 4, factor: 1.1, delay: 200});
          expect(false).toBeTruthy(); // fail(), should not reach this line.
        } catch (e) {
          expect(new Date() - startTime).toBeGreaterThan(4 * 200);
        }
      });
    });
  });
});
