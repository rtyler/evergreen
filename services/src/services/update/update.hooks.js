
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

  terribleHardCodedDefault(context) {
    const manifest = {
      'schema' : 1,
      'meta' : {
        'level' : context.result[0].id,
        'channel' : 'general'
      },
      'core' : {
        'url' : 'http://mirrors.jenkins.io/war/latest/jenkins.war',
        'checksum' : {
          'type' : 'sha256',
          'signature' : '246c298e9f9158f21b931e9781555ae83fcd7a46e509522e3770b9d5bdc88628'
        }
      },
      'plugins' : {
        'updates' : [
          {
            'url' : 'http://mirrors.jenkins.io/plugins/git-client/2.7.1/git-client.hpi',
            'checksum' : {
              'type' : 'sha256',
              'signature' : '192f32b9d8c60c2471d99517b512316c2398e582eeb153290508b4319d7b03ab'
            }
          }
        ]
      },
      'client' : {
      }
    };

    context.result = manifest;
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

      after: {
        find: [
          this.terribleHardCodedDefault,
        ],
      },
      error: {}
    };
  }
}

module.exports = new UpdateHooks();
