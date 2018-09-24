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
        // plugin is ~1 MB, so it could make tests more flaky and cumbersome with flaky connection
        const toDownload = 'http://updates.jenkins-ci.org/download/plugins/blueocean-pipeline-editor/1.5.0/blueocean-pipeline-editor.hpi';
        const sha256 = 'ccaaae7c899b7b15a5bd60f1e59336ca9adf5d08c01de5d123416e83ea5314db';
        await Downloader.download(toDownload, dir, 'ace-editor.hpi');
        expect(Checksum.signatureFromFile(`${dir}/ace-editor.hpi`)).toEqual(sha256);
      });

      it('should not retry too fast on failed download', async () => {
        const toDownload = 'http://nonexisting-url-yada.org/thefile';
        const startTime = new Date();
        try {
          await Downloader.download(toDownload, dir, 'thefile', null, {delay: 20, retry: 4, factor: 10});
          expect(false).toBeTruthy(); // fail(), should not reach this line.
        } catch (e) {
          expect(new Date() - startTime).toBeGreaterThan(0 + 20 + 200 + 2000);
        }
      });
    });
  });
});
