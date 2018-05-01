
//const ensureMatchingUUID = require('../../hooks/ensureuuid');
const authentication     = require('@feathersjs/authentication');

class UpdateHooks {
  constructor() {
  }

  scopeFindQuery(context) {
    context.params.query = {
      tainted: false,
      channel: 'general',
      $limit: 1,
      $sort: {
        createdAt: -1,
      }
    };
    return context;
  }

  getHooks() {
    return {
      before: {
        all: [
          authentication.hooks.authenticate(['jwt'])
        ],
        find: [
          //ensureMatchingUUID,
          this.scopeFindQuery,
        ],
        get: [],
        create: [],
        update: [],
        patch: [],
        remove: []
      },

      after: {},
      error: {}
    };
  }
}

module.exports = new UpdateHooks();
