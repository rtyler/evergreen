const assert  = require('assert');
const request = require('request-promise');
const h       = require('../helpers');

describe('Error Telemetry service acceptance tests', () => {
  beforeAll(done => h.startApp(done));
  afterAll(done => h.stopApp(done));

  describe('without registration', () => {
    it('should not allow unauthorized access', () => {
      return request({
        url: h.getUrl('/telemetry/error'),
        json: true,
        method: 'POST'
      })
        .then(() => assert.fail('This should not have succeeded'))
        .catch((err) => expect(err.statusCode).toEqual(401));
    });
  });

  describe('with a pre-existing registration', () => {
    beforeEach(async () => {
      this.keys = h.generateKeys();
      this.reg = await h.register(this.keys);
    });

    describe('and an auth token', () => {
      beforeEach(async () => {
        const signature = this.keys.sign(this.reg.uuid);
        this.token = await request({
          url: h.getUrl('/authentication'),
          method: 'POST',
          json: true,
          body: {
            uuid: this.reg.uuid,
            signature: signature
          }
        });
      });

      it('should reject bad logs', () => {
        let emptyLog = {
          uuid: this.reg.uuid,
          log: 'timestamp'
        };
        return request({
          url: h.getUrl('/telemetry/error'),
          method: 'POST',
          headers: { 'Authorization': this.token },
          json: true,
          body: emptyLog
        })
          .then(res => assert.fail(res))
          .catch(err => {
            expect(err.statusCode).toEqual(400);
            expect(err.error.status).toEqual('ERROR');
            expect(err.error.message).toEqual('Missing required field \'version\'');
          });
      });

      it('should reject invalid json', () => {
        return request({
          url: h.getUrl('/telemetry/error'),
          method: 'POST',
          headers: { 'Authorization': this.token },
          json: true,
          body: 'invalid json'
        })
          .then(res => assert.fail(res))
          .catch(err => {
            expect(err.statusCode).toEqual(400);
            expect(err.error.status).toEqual('ERROR');
            expect(err.error.message).toEqual('Unexpected token " in JSON at position 0');
          });
      });

      it('should reject large payloads', () => {
        let largeMessage = new Array(1000001).join('a');
        let largeLog = {
          uuid: this.reg.uuid,
          log: {
            version: 1,
            timestamp: 1522840762769,
            name: 'io.jenkins.plugins.SomeTypicalClass',
            level: 'WARNING',
            message: largeMessage,
            exception: {
              raw: 'serialized exception\n many \n many \n lines'
            }
          }
        };
        return request({
          url: h.getUrl('/telemetry/error'),
          method: 'POST',
          headers: { 'Authorization': this.token },
          json: true,
          body: largeLog
        })
          .then(res => assert.fail(res))
          .catch(err => {
            expect(err.statusCode).toEqual(413);
            expect(err.error.status).toEqual('ERROR');
          });
      });

      it('should accept correctly formatted logs', () => {
        let emptyLog = {
          uuid: this.reg.uuid,
          log: {
            version: 1,
            timestamp: 1522840762769,
            name: 'io.jenkins.plugins.SomeTypicalClass',
            level: 'WARNING',
            message: 'the message 1\nand another line',
          }
        };
        return request({
          url: h.getUrl('/telemetry/error'),
          method: 'POST',
          headers: { 'Authorization': this.token },
          json: true,
          body: emptyLog
        })
          .then(res => {
            assert.ok(res);
            assert.equal(res.status, 'OK', 'response.status should be OK but got: ' + res.status);
          })
          .catch(err => assert.fail(err));
      });

      it('should accept correctly formatted logs with exception', () => {
        let emptyLog = {
          uuid: this.reg.uuid,
          log: {
            version: 1,
            timestamp: 1522840762769,
            name: 'io.jenkins.plugins.SomeTypicalClass',
            level: 'WARNING',
            message: 'the message 2\nand another line',
            exception: {
              raw: 'serialized exception\n many \n many \n lines'
            }
          }
        };
        return request({
          url: h.getUrl('/telemetry/error'),
          method: 'POST',
          headers: { 'Authorization': this.token },
          json: true,
          body: emptyLog
        })
          .then(res => {
            expect(res).toBeTruthy();
            expect(res.status).toEqual('OK');
          })
          .catch(err => assert.fail(err));
      });
    });
  });
});
