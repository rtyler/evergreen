const assert             = require('assert');
const errors             = require('@feathersjs/errors');
const ensureMatchingUUID = require('../../src/hooks/ensureuuid');

describe('ensureuuid hook', () => {
  let context = {
    params: {
      provider: 'rest',
    },
    data: {},
  };

  it('should fail if the request does not include a UUID', () => {
    try {
      assert.fail(ensureMatchingUUID(context));
    }
    catch (err) {
      assert.equal(err.name, errors.BadRequest.name);
    }
  });

  it('should fail if the JWT uuid and the given UUID are identical', () => {
    context.data.uuid = 'who i want to be';
    context.params.payload = { uuid: 'who i be' };
    try {
      assert.fail(ensureMatchingUUID(context));
    }
    catch (err) {
      assert.equal(err.name, errors.NotAuthenticated.name);
    }
  });

  describe('for internal service calls', () => {
    beforeEach(() => {
      delete context.params.provider;
    });

    it('should return successfully', () => {
      assert.ok(ensureMatchingUUID(context));
    });
  });
});
