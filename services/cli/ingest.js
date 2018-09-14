'use strict';

const fs      = require('fs');
const logger  = require('winston');
const request = require('request-promise');

const UrlResolver = require('./url-resolver');

/*
 * Class responsible for computing the ingest.json based off of a given
 * realized essentials.yaml file
 */
class Ingest {
  constructor(manifest) {
    this.manifest = manifest;
    this.ingest = {
      timestamp: Date.now(),
      core: {},
      plugins: [],
      environments: {},
    };
  }

  /*
   * Use the manifest passed in to compute all the URLs and fetch the checksums
   * for all the references
   *
   * @return {Promise}
   */
  resolveReferences() {
    let tasks = [];

    this.ingest.evergreen = {
      environments: {
      },
    };

    this.manifest.data.spec.evergreen.environments.forEach((e) => {
      const zipUrl = UrlResolver.evergreenRelease(e.name, e.version);
      const record = {
        url: zipUrl,
        checksum: {},
      };
      this.ingest.evergreen.environments[e.name] = record;
      tasks.push(
        request(`${zipUrl}.sha256`)
          .then((res) => {
            Object.assign(this.ingest.evergreen.environments[e.name].checksum, {
              type: 'sha256',
              signature: res.split(' ')[0]
            });
          })
      );
    });

    const coreUrl = UrlResolver.artifactForCore(this.manifest.data.status.core);
    this.ingest.core = {
      url: coreUrl,
      checksum: {},
    };

    tasks.push(
      request(`${coreUrl}.sha256`)
        .then((res) => {
          Object.assign(this.ingest.core.checksum, {
            type: 'sha256',
            signature: res.split(' ')[0]
          });
        })
    );

    this.manifest.data.status.plugins
      .forEach((plugin) => {
        this.ingest.plugins.push(this.fetchDataForPlugin(tasks, plugin));
      });

    const environments = this.manifest.data.status.environments;
    environments.forEach((environment) => {
      let env = {
        plugins: [],
      };
      this.ingest.environments[environment.name] = env;

      if (environment.plugins) {
        environment.plugins.forEach((plugin) => {
          env.plugins.push(this.fetchDataForPlugin(tasks, plugin));
        });
      }
    });

    return Promise.all(tasks);
  }

  fetchDataForPlugin(tasks, plugin) {
    const url = UrlResolver.artifactForPlugin(plugin);
    let record = Object.assign(plugin, {
      url: url,
      checksum: {},
    });

    tasks.push(
      this.fetchHeadersFor(url).then((res) => {
        Object.assign(record.checksum, {
          type: 'sha256',
          signature: res.headers['x-checksum-sha256'],
        });
      })
    );
    return record;
  }

  fetchHeadersFor(url) {
    return request({
      method: 'HEAD',
      uri: url,
      resolveWithFullResponse: true,
    });
  }

  saveSync() {
    const fileName = 'ingest.json';
    logger.info(`Writing out ingest to ${fileName}`);
    return fs.writeFileSync(fileName,
      JSON.stringify(this.ingest, undefined, 2));
  }
}
module.exports = Ingest;
