/*
 * Status service hooks
 */

const authentication     = require('@feathersjs/authentication');
const internalOnly       = require('../../hooks/internalonly');
const ensureMatchingUUID = require('../../hooks/ensureuuid');

/*
 * StatusHooks are all the hooks necessary to run the status service properly
 */
class StatusHooks {
  constructor () {
  }

  getHooks() {
    return {
      before: {
        all: [
          authentication.hooks.authenticate(['jwt'])
        ],
        get: [
          this.includeAssociations,
        ],
        create: [
          ensureMatchingUUID,
          module.exports.defaultUpdateLevel,
          module.exports.pruneQueryParams,
        ],

        update: [
          ensureMatchingUUID,
        ],
        patch: [
          ensureMatchingUUID,
        ],
        remove: [
          internalOnly
        ]
      },
      after: {},
      error: {}
    };
  }

  /*
   * Include the model's associations in the output from the hook
   */
  includeAssociations(context) {
    if (!context.params.sequelize) {
      context.params.sequelize = {};
    }
    Object.assign(context.params.sequelize, {
      include: [ context.app.get('models').update ]
    });
    return context;
  }

  /*
   * delete extra parameters included in the query string
   */
  pruneQueryParams(context) {
    if (context.params.query) {
      delete context.params.query.include;
    }
    return context;
  }

  /*
   * Default new instances into the latest update record in the `general` channel.
   */
  async defaultUpdateLevel(context) {
    const updates = context.app.service('update');
    const result = await updates.find();

    if (result.size == 0) {
      throw new Error('Failed to find the latest `general` updates for instance creation');
    }
    /*
      * The result returned is a paginated object
      */
    context.data.updateId = result.meta.level;
    return context;
  }
}

/*
 * To make things easier to unit test, these hook functions are being exported
 */
module.exports = new StatusHooks();
