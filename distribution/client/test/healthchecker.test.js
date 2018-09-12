const HealthChecker = require('../src/lib/healthchecker');
const logger        = require('winston');
const http          = require('http');

describe('The healthchecker module', () => {
  let server = null;
  let port = -1;

  // cf. https://github.com/jenkinsci/jep/tree/master/jep/306#specification
  // true below means: behave healthy
  // false configures the option to return unhealthy
  let serverOptions = {
    instanceIdentity: true,
    metrics: {
      plugins: true,
      deadlock: true
    }
  };

  describe('check()', () => {

    it('should pass cases', async (done) => {
      // ugly hack to wait a bit for the server to start...
      setTimeout( async () => {
        const healthChecker = new HealthChecker(`http://localhost:${port}`);

        let result = await healthChecker.check();
        expect(result.healthy).toBe(true);
        expect(result.message).not.toContain('wrong');

        // broken /instance-identity page
        serverOptions.instanceIdentity = false;
        result = await healthChecker.check();
        expect(result.healthy).toBe(false);

        // issue: a plugin is failed
        serverOptions.instanceIdentity = true;
        serverOptions.metrics.plugins = false;
        result = await healthChecker.check();
        expect(result.healthy).toBe(false);
        expect(result.message).toContain('wrong');

        // issue: deadlock
        serverOptions.instanceIdentity = true;
        serverOptions.metrics.plugins = true;
        serverOptions.metrics.deadlock = false;
        result = await healthChecker.check();
        expect(result.healthy).toBe(false);
        expect(result.message).toContain('wrong');

        // back to all should work
        serverOptions.instanceIdentity = true;
        serverOptions.metrics.plugins = true;
        serverOptions.metrics.deadlock = true;
        result = await healthChecker.check();
        expect(result.healthy).toBe(true);

        done();
      }, 1000);

    });
  });

  // Code below handles the very simple embedded test http server code and cases
  // See serverOptions above for behavior "configuration" of this test server
  beforeEach( async (done) => {
    port = 3000; // Math.floor(Math.random() * (65535 - 1024) + 1024);

    let textReponse = 'Hello Node.js Server!';
    const requestHandler = (request, response) => {
      if (request.url.endsWith('/instance-identity/')) {
        if ( !serverOptions.instanceIdentity) {
          response.statusCode = 404;
        } else {
          textReponse = 'fake -----BEGIN PUBLIC KEY----- ...-----END PUBLIC KEY-----';
        }
      }
      if (request.url.endsWith('/metrics/evergreen/healthcheck')) {
        let pluginsHealthy = true;
        let noDeadlock = true;

        if (!serverOptions.metrics.plugins) {
          pluginsHealthy = false;
        }
        if (!serverOptions.metrics.deadlock) {
          noDeadlock = false;
        }
        textReponse = JSON.stringify({
          'disk-space': {
            healthy: true
          },
          plugins: {
            healthy: pluginsHealthy,
            message: 'No failed plugins'
          },
          'temporary-space': {
            healthy: true
          },
          'thread-deadlock': {
            healthy: noDeadlock
          }
        });
      }
      response.end(textReponse);
    };

    server = http.createServer(requestHandler);

    logger.debug(`Start server on port ${port}`);
    server.listen(port, (err) => {
      if (err) {
        return logger.error('something bad happened', err);
      }

      logger.info(`Test server is listening on ${port}`);
      done();
    });
  });

  afterEach( async (done) => {
    server.close(() => {
      logger.debug('HTTP server shutdown');
      done();
    });
  });

});
