/*
 * This test suite covers the interactions between the `versions` and the
 * `update` service for generating the appropriate update manifest for a
 * client.
 */

const fs      = require('fs');
const path    = require('path');
const request = require('request-promise');
const logger  = require('winston');
const h       = require('./helpers');

describe('versions/updates interaction acceptance tests', () => {
  beforeAll(done => h.startApp(done));
  afterAll(done => h.stopApp(done));

  beforeEach(async () => {
    /*
     * We always want to make sure we have a properly seeded database with the
     * latest from ingest.yaml for each test.
     */
    this.ingest = JSON.parse(fs.readFileSync('./ingest.json'));
    this.settings = JSON.parse(fs.readFileSync(`./config/${process.env.NODE_ENV}.json`));

    return request({
      url: h.getUrl('/update'),
      method: 'POST',
      headers: { 'Authorization': this.settings.internalAPI.secret },
      json: true,
      body: {
        commit: Date.now().toString(),
        manifest: this.ingest,
      },
    })
      .then(res => this.update = res);
  });

  describe('with a docker-cloud flavored client', () => {
    beforeEach(async () => {
      let { token, uuid } = await h.registerAndAuthenticate();
      this.token = token;
      this.uuid = uuid;

      /*
      * Once we have registered, we need to send a status in order for updates
      * to properly be loaded.
      */
      await request({
        url: h.getUrl('/status'),
        method: 'POST',
        headers: { 'Authorization': this.token },
        json: true,
        body: {
          uuid: this.uuid,
          flavor: 'docker-cloud'
        }
      });
    });

    describe('fetching updates for a fresh client', () => {
      beforeEach(async () => {
        this.response = await request({
          url: h.getUrl(`/update/${this.uuid}`),
          headers: { 'Authorization': this.token },
          json: true
        });
      });

      it('should be in the `general` channel', () => {
        expect(this.response).toHaveProperty('meta.channel', 'general');
      });

      it('should have a core url', () => {
        expect(this.response).toHaveProperty('core.url');
      });

      it('should have plugins', () => {
        expect(this.response).toHaveProperty('plugins.updates');
        expect(this.response.plugins.updates.length).toBeGreaterThan(0);
      });

      it('should include the docker-plugin', () => {
        expect(this.response).toHaveProperty('plugins.updates');
        let foundPlugin = false;
        this.response.plugins.updates.forEach((plugin) => {
          if (plugin.url.match(/docker-plugin/)) {
            foundPlugin = true;
          }
        });
        expect(foundPlugin).toBeTruthy();
      });

      describe('fetching updates when the client has marked theirs as tainted', () => {
        beforeEach(() => {
          return request.post({
            url: h.getUrl('/update/tainted'),
            headers: { 'Authorization': this.token },
            body: {
              uuid: this.uuid,
              /* marking the update level we've just received as tainted */
              level: this.response.meta.level,
            },
            json: true
          });
        });

        it('should not receive the tainted update level', () => {
          const taintedLevel = this.response.meta.level;
          expect(taintedLevel).toEqual(this.update.id);

          const payload = {
            url: h.getUrl(`/update/${this.uuid}`),
            headers: { 'Authorization': this.token },
            qs: {
              level: taintedLevel,
            },
            json: true
          };
          logger.error(`Tainted level is ${taintedLevel}`);
          return request(payload)
            /* Making the assumption in tests that a legit update is -1 */
            .then(r => expect(r.meta.level).toEqual(taintedLevel - 1))
            .then ( () => {
              // let's check that a subsequent request with the rolled back level does not yield the tainted one
              payload.qs.level = taintedLevel - 1;
              return request(payload);
            }).then ( r => {
              expect(r.meta.level).toEqual(taintedLevel - 1);
            });
        });
      });

      describe('a follow-up request for updates', () => {
        it('should receive a 304 Not Modified response', () => {
          return request({
            url: h.getUrl(`/update/${this.uuid}`),
            headers: { 'Authorization': this.token },
            qs: {
              level: this.response.meta.level,
            },
            json: true
          })
            .then(r => expect(r).toBeFalsy())
            .catch(err => expect(err.statusCode).toBe(304));
        });

        describe('with multiple new update levels in the backend', () => {
          beforeEach(async () => {
            this.updates = [];
            this.updates.push(await request({
              url: h.getUrl('/update'),
              method: 'POST',
              headers: { 'Authorization': this.settings.internalAPI.secret },
              json: true,
              body: {
                commit: Date.now().toString(),
                manifest: this.ingest,
              },
            }));
            this.updates.push(await request({
              url: h.getUrl('/update'),
              method: 'POST',
              headers: { 'Authorization': this.settings.internalAPI.secret },
              json: true,
              body: {
                commit: Date.now().toString(),
                manifest: this.ingest,
              },
            }));
          });

          it('should only be given the next incremental update', () => {
            return request({
              url: h.getUrl(`/update/${this.uuid}`),
              headers: { 'Authorization': this.token },
              qs: {
                test: true,
                level: this.response.meta.level,
              },
              json: true
            })
              .then(r => expect(r.meta.level).toEqual(this.updates[0].id));
          });
        });
      });
    });


    describe('fetch updates for a client with empty `versions` records', () => {
      beforeEach(async () => {
        const versions = {
          schema: 1,
          container: {},
          client: {},
          jenkins: {
            core: null,
            plugins: {},
          },
        };

        await request({
          url: h.getUrl('/versions'),
          method: 'POST',
          headers: { 'Authorization': this.token },
          json: true,
          body: {
            uuid: this.uuid,
            manifest: versions
          }
        });

        this.response = await request({
          url: h.getUrl(`/update/${this.uuid}`),
          headers: { 'Authorization': this.token },
          json: true
        });
      });

      it('should be given that core version as an update', () => {
        expect(this.response).toBeTruthy();
        expect(this.response).toHaveProperty('core.url');
      });

      it('should have plugins', () => {
        expect(this.response).toHaveProperty('plugins.updates');
        expect(this.response.plugins.updates.length).toBeGreaterThan(0);
      });

      it('should include the docker-plugin', () => {
        expect(this.response).toHaveProperty('plugins.updates');
        const found = this.response.plugins.updates
          .filter(p => p.url.match(/docker-plugin/));
        expect(found).toHaveLength(1);
      });
    });

    describe('fetching updates for a client with filled out `versions` records', () => {
      beforeEach(async () => {
        /*
        * First we need to publish a versions
        */
        let pluginManifest = this.ingest.plugins[0];
        this.pluginName = pluginManifest.artifactId;
        this.invalidPluginName = 'no-longer-valid';

        let versions = {
          schema: 1,
          container: {},
          client: {},
          jenkins: {
            core: this.ingest.core.checksum.signature,
            plugins: {},
          },
        };
        versions.jenkins.plugins[this.pluginName] = pluginManifest.checksum.signature;
        versions.jenkins.plugins[this.invalidPluginName] = 'random_checksum';

        await request({
          url: h.getUrl('/versions'),
          method: 'POST',
          headers: { 'Authorization': this.token },
          json: true,
          body: {
            uuid: this.uuid,
            manifest: versions
          }
        });
        this.response = await request({
          url: h.getUrl(`/update/${this.uuid}`),
          headers: { 'Authorization': this.token },
          json: true
        });
      });

      it('should not be given that core version as an update', () => {
        expect(this.response).toBeTruthy();
        expect(this.response).toHaveProperty('core', {});
      });

      it('should not be given a plugin it already has', () => {
        expect(this.response).toBeTruthy();
        expect(this.response).toHaveProperty('plugins.updates');

        let found = false;
        this.response.plugins.updates.forEach((plugin) => {
          if (plugin.artifactId == this.pluginName) {
            found = true;
          }
        });
        expect(found).not.toBeTruthy();
      });

      it('should be given no longer used plugins in deletes', () => {
        expect(this.response).toBeTruthy();
        expect(this.response).toHaveProperty('plugins.deletes');
        expect(this.response.plugins.deletes).toHaveLength(1);
        expect(this.response.plugins.deletes).toEqual(expect.arrayContaining([this.invalidPluginName]));
      });
    });
  });

  /*
   * See https://issues.jenkins-ci.org/browse/JENKINS-53318
   */
  describe('a client with versions and a flavor (JENKINS-53318)', () => {
    beforeEach(async () => {
      this.ingest = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/53318/ingest.json')));
      this.versions = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/53318/versions.json')));

      this.update = await request.post({
        url: h.getUrl('/update'),
        headers: { 'Authorization': this.settings.internalAPI.secret },
        json: true,
        body: {
          commit: Date.now().toString(),
          manifest: this.ingest,
        },
      });

      let { token, uuid } = await h.registerAndAuthenticate();
      this.token = token;
      this.uuid = uuid;
      /*
      * Once we have registered, we need to send a status in order for updates
      * to properly be loaded.
      */
      this.status = await request({
        url: h.getUrl('/status'),
        method: 'POST',
        headers: { 'Authorization': this.token },
        json: true,
        body: {
          uuid: this.uuid,
          flavor: 'docker-cloud'
        }
      });
      this.posted_versions = await request.post({
        url: h.getUrl('/versions'),
        headers: { 'Authorization': this.token },
        json: true,
        body: {
          uuid: this.uuid,
          manifest: this.versions
        }
      });
    });

    it('should get the docker-plugin, which comes from a flavor', async () => {
      const response = await request({
        url: h.getUrl(`/update/${this.uuid}`),
        headers: { 'Authorization': this.token },
        json: true
      });
      expect(response).toHaveProperty('plugins.updates');

      const found = response.plugins.updates
        .filter(p => p.url.match(/docker-plugin/));
      expect(found).toHaveLength(1);
    });
  });
});
