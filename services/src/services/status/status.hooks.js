/*
 * Status service hooks
 */

const authentication     = require('@feathersjs/authentication');
const errors             = require('@feathersjs/errors');
const dbtimestamp        = require('../../hooks/dbtimestamp');
const internalOnly       = require('../../hooks/internalonly');
const ensureMatchingUUID = require('../../hooks/ensureuuid');

const instanceRequiredFields = [
  'flavor'
];

/*
 * StatusHooks are all the hooks necessary to run the status service properly
 */
class StatusHooks {
  constructor () {
  }

  validateRequiredFields(hook) {
    if (!(hook.data)) {
      throw new errors.BadRequest('Missing data');
    }
    instanceRequiredFields.forEach( field => {
      if (!hook.data[field]) {
        throw new errors.BadRequest(`Missing required field '${field}'`);
      }
    });
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
          this.validateRequiredFields,
          dbtimestamp('createdAt'),
          module.exports.defaultUpdateLevel,
          module.exports.pruneQueryParams,
        ],

        update: [
          ensureMatchingUUID,
          dbtimestamp('updatedAt'),
        ],
        patch: [
          ensureMatchingUUID,
          dbtimestamp('updatedAt'),
        ],
        remove: [
          internalOnly,
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
    const records = await updates.find({
      query: {
        $limit: 1,
        $sort: {
          createdAt: -1,
        },
      },
    });

    if (records.length === 0) {
      throw new Error('Failed to find the latest `general` updates for instance creation');
    }

    context.data.updateId = records[0].id;
    return context;
  }
}

/*
 * To make things easier to unit test, these hook functions are being exported
 */
module.exports = new StatusHooks();
