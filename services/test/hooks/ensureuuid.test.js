const errors             = require('@feathersjs/errors');
const ensureMatchingUUID = require('../../src/hooks/ensureuuid');

describe('ensureuuid hook', () => {
  beforeEach(() => {
    this.context = {
      params: {
        provider: 'rest',
        user: {},
        query: {},
      },
      data: {},
    };
  });

  it('should fail if the request does not include a UUID', () => {
    expect(() => {
      ensureMatchingUUID(this.context);
    }).toThrow(errors.BadRequest);
  });

  it('should fail if the JWT uuid and the given UUID are identical', () => {
    this.context.data.uuid = 'who i want to be';
    this.context.params.user = { uuid: 'who i be' };
    expect(() => {
      ensureMatchingUUID(this.context);
    }).toThrow(errors.NotAuthenticated);
  });

  describe('for internal service calls', () => {
    beforeEach(() => {
      delete this.context.params.provider;
    });

    it('should return successfully', () => {
      return expect(ensureMatchingUUID(this.context));
    });
  });

  describe('for find methods which use query parameters', () => {
    beforeEach(() => {
      this.context.method = 'find';
    });

    it('should fail with an omitted query parameter', () => {
      expect(() => {
        ensureMatchingUUID(this.context);
      }).toThrow(errors.BadRequest);
    });

    it('should allow the request with a matching `uuid` query param', () => {
      let uuid = 'jest-uuid';
      /* This is the property name that JWT would extract to */
      this.context.params.user.uuid = uuid;
      this.context.params.query = { uuid: uuid };

      return expect(ensureMatchingUUID(this.context));
    });

    it('should fail without matching token and query param `uuid`s', () => {
      let uuid = 'jest-uuid';
      /* This is the property name that JWT would extract to */
      this.context.params.user.uuid = uuid;
      this.context.params.query = { uuid: 'pickles', };

      expect(() => {
        ensureMatchingUUID(this.context);
      }).toThrow(errors.NotAuthenticated);
    });
  });

  describe('for get methods which use the uuid as an id', () => {
    let uuid = 'jest-uuid';

    beforeEach(() => {
      this.context.method = 'get';
      /* This is the property name that JWT would extract to */
      this.context.params.user.uuid = uuid;
    });

    it('should be NotAuthenticated when the `id` doesn\'t match the JWT', () => {
      this.context.id = 'pickles';

      expect(() => {
        ensureMatchingUUID(this.context);
      }).toThrow(errors.NotAuthenticated);
    });

    it('should allow the request when the `id` matches', () => {
      this.context.id = uuid;
      expect(ensureMatchingUUID(this.context)).toBe(this.context);
    });
  });
});
