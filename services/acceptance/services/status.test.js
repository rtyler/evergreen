const assert  = require('assert');
const request = require('request-promise');
const h       = require('../helpers');

describe('Status service acceptance tests', () => {
  beforeAll(done => h.startApp(done));
  afterAll(done => h.stopApp(done));

  it('should not allow unauthorized access', () => {
    return request({
      url: h.getUrl('/status'),
      json: true
    })
      .then((res) => assert.fail(res))
      .catch((err) => expect(err.statusCode).toEqual(401));
  });

  describe('with a pre-existing registration', () => {
    describe('and an auth token', () => {
      beforeEach(async () => {
        let { token, uuid } = await h.registerAndAuthenticate();
        this.token = token;
        this.uuid = uuid;
      });

      it('should allow authorized access', () => {
        return request({
          url: h.getUrl('/status'),
          headers: { 'Authorization': this.token },
          json: true,
          resolveWithFullResponse: true
        })
          .then(res => {
            expect(res.statusCode).toEqual(200);
            expect(res).toBeTruthy();
          })
          .catch((err) => assert.fail(err));
      });

      describe('POST /status (create)', () => {
        it('should return a valid `channel`', async () => {
          const response = await request({
            url: h.getUrl('/status'),
            method: 'POST',
            headers: { 'Authorization': this.token },
            json: true,
            body: { uuid: this.uuid, flavor: 'aws-ec2-cloud' }
          });

          expect(response).toBeTruthy();
          expect(response.updateId).toBeTruthy();
        });

        it('should not allow creating a status for missing flavor', async () => {
          return request({
            url: h.getUrl('/status'),
            method: 'POST',
            headers: { 'Authorization': this.token },
            json: true,
            body: { uuid: this.uuid }
          })
            .then(res => assert.fail(res))
            .catch(err => expect(err.statusCode).toEqual(400));
        });

        it('should not allow creating a status for a uuid not in the JWT', () => {
          return request({
            url: h.getUrl('/status'),
            method: 'POST',
            headers: { 'Authorization': this.token },
            json: true,
            body: { uuid: 'fake out!' }
          })
            .then(res => assert.fail(res))
            .catch(err => expect(err.statusCode).toEqual(401));
        });
      });

      describe('With a valid Instance', () => {
        beforeEach(async ()  => {
          this.instanceId = this.uuid;
          this.response = await request({
            url: h.getUrl('/status'),
            method: 'POST',
            headers: { Authorization: this.token },
            json: true,
            body: { uuid: this.instanceId }
          });
        });

        describe('GET /status/${uuid}', () => {
          beforeEach(async () => {
            this.response = await request({
              url: h.getUrl(`/status/${this.instanceId}`),
              headers: { Authorization: this.token },
              json: true
            });
          });

          it('should return the right uuid in the record', () => {
            expect(this.response).toBeTruthy();
            expect(this.response.uuid).toEqual(this.instanceId);
          });

          it('should return the proper `channel` relationship', () => {
            expect(this.response).toBeTruthy();
            expect(this.response.update).toBeTruthy();
            /* we expect everybody to be in the general channel by default */
            expect(this.response.update.channel).toEqual('general');
          });
        });

        describe('re-POSTing that Instance', () => {
          it('should fail with a Bad Request', () => {
            return request({
              url: h.getUrl('/status'),
              method: 'POST',
              headers: { Authorization: this.token },
              json: true,
              body: { uuid: this.instanceId }
            })
              .then(res => assert.fail(res))
              .catch(err => expect(err.statusCode).toEqual(400));
          });
        });
      });
    });
  });
});
