const assert   = require('assert');
const feathers = require('@feathersjs/feathers');
const Update   = require('../src/lib/update');


describe('The update module', () => {
  let app = feathers();

  it('be a legit object', () => {
    let u = new Update(app);
    assert.equal(typeof u, 'object');
  });

  describe('authenticate()', () => {
    let update = new Update(app);

    it('should store the token and uuid', () => {
      let uuid = 'ohai';
      let token = 'sekret';
      update.authenticate(uuid, token);
      assert.equal(update.uuid, uuid);
      assert.equal(update.token, token);
    });
  });
});
