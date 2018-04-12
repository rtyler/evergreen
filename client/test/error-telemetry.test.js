jest.mock('fs');

const assert         = require('assert');
const fs             = require('fs');
const ErrorTelemetry = require('../lib/error-telemetry');
const mkdirp         = require('mkdirp');
const logger = require('winston');

describe('Error Telemetry Logging', () => {
  beforeEach(() => {
    /* Make sure memfs is flushed every time */
    fs.volume.reset();
  });

  describe('setup() call', () => {
    it('should not return a Promise', () => {
      const response = (new ErrorTelemetry()).setup();
      assert(response instanceof Promise);
    });

    // FIXME: only hackish, the end goal is definitely not to forward to another file
    it('writing to essentials logging file should forward to another', () => {
      jest.useFakeTimers();

      // Write before setup to make sure the file is already present
      const logsDir = '/evergreen/jenkins/var/logs/';
      mkdirp.sync(logsDir);
      fs.writeFileSync(logsDir + 'essentials.log.0', '{"timestamp":1523451065975,"level":"SEVERE","message":"WAT"}');

      const response = (new ErrorTelemetry()).setup();
      assert(response instanceof Promise);

      // Write again
      fs.appendFileSync(logsDir + 'essentials.log.0', '{"timestamp":1523451065975,"level":"SEVERE","message":"WAT2"}');

      assert(!fs.existsSync('/tmp/test'));

      setTimeout(function() {
        logger.error('YAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
        assert(fs.existsSync('/tmp/test'));
        assert.equal('MESSAGE =WAT\nMESSAGE=WAT2', fs.readFileSync('/tmp/test','utf8'));
      }, 5000);
      jest.runAllTimers();

      //assert(response instanceof Promise);
    });
  });
});
