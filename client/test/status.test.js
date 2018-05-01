const assert   = require('assert');
const feathers = require('@feathersjs/feathers');
const Status   = require('../src/lib/status');

describe('The status module', () => {
  let app = feathers();
  it('should be constructable', () => {
    const s = new Status(app);
    assert.ok(s);
  });

  describe('getTimezone()', () => {
    it('should return the client timezone', () => {
      let s = new Status(app);
      assert.equal(typeof s.getTimezone(), 'string');
    });
  });

  describe('create()', () => {
  });

  describe('manifestFromZip', () => {
    let s = new Status(app);

    describe('with mock-jenkins.war', () => {
      it('should parse out the Jenkins-Version', async () => {
        const results = await s.manifestFromZip('test/mock-jenkins.war');
        assert.equal(results['Jenkins-Version'], '2.116');
      });
    });

    describe('with a mock plugin', () => {
      it('should parse out the Plugin-Version', async () => {
        const results = await s.manifestFromZip('test/mock-plugins/workflow-aggregator.hpi');
        assert.equal(results['Plugin-Version'], '2.5');
      });
    });
  });

  describe('parseRawManifest', () => {
    let manifest = [
      'Manifest-Version: 1.0',
      'Hudson-Version: 1.395',
      'Remoting-Minimum-Supported-Version: 2.60',
      'Implementation-Version: 2.116',
      'Built-By: kohsuke',
      'Remoting-Embedded-Version: 3.19',
      'Jenkins-Version: 2.116',
      'Created-By: Apache Maven 3.3.9',
      'Build-Jdk: 1.8.0_144',
      'Main-Class: Main',
      '',
      'Name: WEB-INF/security/SecurityFilters.groovy',
      'SHA-256-Digest: wutk4867i4dBQglc8LP+FA7mWC1++m0nn00oQ2TOWoA='].join('\r\n');

    it('should return an object from the text', () => {
      let s = new Status(app);
      let result = s.parseRawManifest(manifest);

      assert.ok(result);
      assert.equal(Object.keys(result).length, 12);
      assert.equal(result['Jenkins-Version'], '2.116');
    });
  });

  describe('authenticate()', () => {
    let s = new Status(app);

    it('should store the token', () => {
      let token = 'sekret';
      let uuid = 'ohai';
      s.authenticate(uuid, token);
      assert.equal(s.uuid, uuid);
      assert.equal(s.token, token);
    });
  });
});
