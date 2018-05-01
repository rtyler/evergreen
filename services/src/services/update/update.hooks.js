
//const ensureMatchingUUID = require('../../hooks/ensureuuid');
const authentication = require('@feathersjs/authentication');

class UpdateHooks {
  constructor() {
  }

  scopeFindQuery(context) {
    let level = 0;
    let channel = 'general';

    /*
     * Use the level provided in the query parameters if it's available,
     * otherwise default to zero
     */
    if (context.params.query) {
      level = context.params.query.level || level;
      channel = context.params.query.channel || channel;
    }

    let query = {
      tainted: false,
      channel: channel,
      $limit: 1,
    };

    /*
     * By default, we want to take the latest Update Level, which is a:
     *  ORDER BY createdAt DESC LIMIT 1
     *
     * For queries with levels, we want to take the _next_ Update Level, which
     * is:
     *  WHERE id  > ? ORDER BY createdAt ASC LIMIT 1
     */
    if (level != 0) {
      Object.assign(query, {
        id: {
          $gt: level,
        },
        $sort: {
          createdAt: 1,
        }
      });
    }
    else {
      Object.assign(query, {
        $sort: {
          createdAt: -1,
        }
      });
    }

    context.params.query = query;
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
