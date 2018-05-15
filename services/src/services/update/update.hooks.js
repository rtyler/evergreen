
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
    if (context.result.length == 0) {
      // TODO set 304 Not Modified
      context.result = {};
      return context;
    }

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
            'url' : 'https://updates.jenkins.io/latest/apache-httpcomponents-client-4-api.hpi',
            'checksum' : {
              'type' : 'sha256',
              'signature' : 'c4f964c6deb599816f6740ef674cb6dd2644d5f1b4e7b886a948f778ec5c189e'
            }
          },
          {
            'url' : 'http://updates.jenkins.io/experimental/latest/configuration-as-code.hpi',
            'checksum' : {
              'type' : 'sha256',
              'signature' : '703f04ad2820a39e131ec66de6872c13556f6a7345e3f50471c2ff7bf3d19f2c'
            }
          },
          {
            'url' : 'https://updates.jenkins.io/latest/ace-editor.hpi',
            'checksum' : {
              'type' : 'sha256',
              'signature' : 'abc97028893c8a71581a5f559ea48e8e1f1a65164faee96dabfed9e95e9abad2'
            }
          },
          {
            'url' : 'https://updates.jenkins.io/latest/bouncycastle-api.hpi',
            'checksum' : {
              'type' : 'sha256',
              'signature' : '6130c9a7132dfe50bde27e256942a7a45f568817e3ad9d5d40ce95330076fad6'
            }
          },
          {
            'url' : 'https://updates.jenkins.io/latest/branch-api.hpi',
            'checksum' : {
              'type' : 'sha256',
              'signature' : '7c8d4890b51257d7a52da2307e98a4dbb11ef64fb353e3c0c4cb7f4579bc5e9e'
            }
          },
          {
            'url' : 'https://updates.jenkins.io/latest/cloudbees-folder.hpi',
            'checksum' : {
              'type' : 'sha256',
              'signature' : 'fcbab0fbabc90b274cd93b235843a040c8f9a7bda08e6cbca8bd2e41c39b65e5'
            }
          },
          {
            'url' : 'https://updates.jenkins.io/latest/command-launcher.hpi',
            'checksum' : {
              'type' : 'sha256',
              'signature' : 'c4f964c6deb599816f6740ef674cb6dd2644d5f1b4e7b886a948f778ec5c189e'
            }
          },
          {
            'url' : 'https://updates.jenkins.io/latest/credentials.hpi',
            'checksum' : {
              'type' : 'sha256',
              'signature' : 'c4f964c6deb599816f6740ef674cb6dd2644d5f1b4e7b886a948f778ec5c189e'
            }
          },
          {
            'url' : 'https://updates.jenkins.io/latest/git-client.hpi',
            'checksum' : {
              'type' : 'sha256',
              'signature' : '192f32b9d8c60c2471d99517b512316c2398e582eeb153290508b4319d7b03ab'
            }
          },
          {
            'url' : 'https://updates.jenkins.io/latest/jackson2-api.hpi',
            'checksum' : {
              'type' : 'sha256',
              'signature' : '4bd83299620d64ad0b439faa438050de8f460d461808216792372f35ce085d27'
            }
          },
          {
            'url' : 'https://updates.jenkins.io/latest/jdk-tool.hpi',
            'checksum' : {
              'type' : 'sha256',
              'signature' : '87ffa354eb3c3eba1185d6086abdd32d60e22fabdd98dfb52cbeba7b1a1a3d4c'
            }
          },
          {
            'url' : 'https://updates.jenkins.io/latest/job-dsl.hpi',
            'checksum' : {
              'type' : 'sha256',
              'signature' : '65fe13a5429374c6b1b7288a8fc98b1a9bbf0208f45cced42fc01c912597a9fd'
            }
          },
          {
            'url' : 'https://updates.jenkins.io/latest/jquery-detached.hpi',
            'checksum' : {
              'type' : 'sha256',
              'signature' : 'a05273cd20c11557ffcb7dcb75150f21d35dc8be28355548b831c2960d7f11c0'
            }
          },
          {
            'url' : 'https://updates.jenkins.io/latest/jsch.hpi',
            'checksum' : {
              'type' : 'sha256',
              'signature' : 'a05273cd20c11557ffcb7dcb75150f21d35dc8be28355548b831c2960d7f11c0'
            }
          },
          {
            'url' : 'https://updates.jenkins.io/latest/metrics.hpi',
            'checksum' : {
              'type' : 'sha256',
              'signature' : 'e7c11c9a751809258f0016221a99f6dc820bd6513600e913e3847551db53d34f'
            }
          },
          {
            'url' : 'https://updates.jenkins.io/latest/scm-api.hpi',
            'checksum' : {
              'type' : 'sha256',
              'signature' : '9c550f85ad8570b9d777a3c9880188fb00e84cbdf5b3704977e1a3e3edc73a47'
            }
          },
          {
            'url' : 'https://updates.jenkins.io/latest/script-security.hpi',
            'checksum' : {
              'type' : 'sha256',
              'signature' : '837a2ed38069d8bc089c5370eaa5858edc519433801949fd6b84d05444f13afe'
            }
          },
          {
            'url' : 'https://updates.jenkins.io/latest/ssh-credentials.hpi',
            'checksum' : {
              'type' : 'sha256',
              'signature' : '837a2ed38069d8bc089c5370eaa5858edc519433801949fd6b84d05444f13afe'
            }
          },
          {
            'url' : 'https://updates.jenkins.io/latest/structs.hpi',
            'checksum' : {
              'type' : 'sha256',
              'signature' : '43a27488fd58f95affdef0766570bbe705ac8c39fe11d3b38208282c21cac58b'
            }
          },
          {
            'url' : 'https://updates.jenkins.io/latest/workflow-api.hpi',
            'checksum' : {
              'type' : 'sha256',
              'signature' : 'b45519a5337b847ad606026cfdb4939f8b2338fa564d92dde8393f6b2f651547'
            }
          },
          {
            'url' : 'https://updates.jenkins.io/latest/workflow-cps.hpi',
            'checksum' : {
              'type' : 'sha256',
              'signature' : '1861d2cd288f7cb81c404647b9bf4a863aea3625fad73d0c8a0930b7742c5eea'
            }
          },
          {
            'url' : 'https://updates.jenkins.io/latest/workflow-job.hpi',
            'checksum' : {
              'type' : 'sha256',
              'signature' : '2476f492128a9e0a878e7531665a404c3713a143df637090c5a488585748f96e'
            }
          },
          {
            'url' : 'https://updates.jenkins.io/latest/workflow-multibranch.hpi',
            'checksum' : {
              'type' : 'sha256',
              'signature' : '20ecbca61fbeb9d15edae5b782bf4ebd61ec5fdac8709cc9ff0d6f71572d925e'
            }
          },
          {
            'url' : 'https://updates.jenkins.io/latest/workflow-scm-step.hpi',
            'checksum' : {
              'type' : 'sha256',
              'signature' : 'a382864adaf0fc80d58243568157a1450028e6d0503a03b81111d4c4de8275d0'
            }
          },
          {
            'url' : 'https://updates.jenkins.io/latest/workflow-step-api.hpi',
            'checksum' : {
              'type' : 'sha256',
              'signature' : '4a0c25d4bb9f985a786774f14c1bdaa02853173e18ad40d49dd13d4c7c8f420e'
            }
          },
          {
            'url' : 'https://updates.jenkins.io/latest/workflow-support.hpi',
            'checksum' : {
              'type' : 'sha256',
              'signature' : 'bafb72d98af4ffb8fd2836d06dba4bdb117eb394fa1f302a071a373a32d4264f'
            }
          },
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
