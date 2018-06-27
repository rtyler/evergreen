jest.mock('fs');

const assert         = require('assert');
const fs             = require('fs');
const path           = require('path');
const mkdirp         = require('mkdirp');

const ErrorTelemetry = require('../src/lib/error-telemetry');

describe('Error Telemetry Logging', () => {
  beforeEach(() => {
    /* Make sure memfs is flushed every time */
    fs.volume.reset();
  });

  describe('authenticate()', () => {
    it('should store values', () => {
      const telemetry = new ErrorTelemetry().authenticate('you-you-i-Dee', 'toe-ken-that-guy');
      assert.equal(telemetry.uuid, 'you-you-i-Dee');
    });
  });

  describe('setup() call', () => {
    const errorTelemetryService = new ErrorTelemetry();

    let logsDir = '/evergreen/jenkins/war/logs';
    let logFile = path.join(logsDir, 'essentials.log.0');

    beforeEach(() => {
      // Set up the directories needed
      mkdirp.sync(logsDir);
      // Seed our log file with one message to start
      fs.writeFileSync(logFile, '{"timestamp":1523451065975,"level":"SEVERE","message":"WAT"}\n');
    });

    // FIXME: only hackish, the end goal is definitely not to forward to another file
    it('writing to essentials logging file should forward to another', done => {
      const forwardedLines = [];

      errorTelemetryService.callErrorTelemetryService = (app,jsonObject) => {
        forwardedLines.push(jsonObject.message);
      };

      const response = errorTelemetryService.setup(logFile);
      expect(response).not.toBe(Promise);
      expect(forwardedLines.length).toEqual(0);

      // when: we write to the file
      fs.appendFileSync(logFile, '{"timestamp":1523451065975,"level":"SEVERE","message":"WAT2"}\n');

      // then: the output function is called, and the mocked file contains what we expect
      setTimeout( () => {
        expect(forwardedLines.length).toEqual(2);
        expect(forwardedLines[1]).toEqual('WAT2');
        done();
      }, 2000);
    });
  });
});
