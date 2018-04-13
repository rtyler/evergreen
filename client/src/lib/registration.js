/*
 * The registration module is responsible for managing the initial registration
 * of the evergreen-client with the backend services layer
 */

const crypto = require('crypto');
const ecc    = require('elliptic');
const fs     = require('fs');
const logger = require('winston');
const path   = require('path');
const mkdirp = require('mkdirp');

const rand   = require('./rand-patch');

class Registration {
  constructor (app, options) {
    this.app = app;
    this.options = options || {};
    this.uuid = null;
    this.publicKey = null;
    this.privateKey = null;
    this.fileOptions = { encoding: 'utf8' };
    this.curve = 'secp256k1';
  }

  isRegistered() {
    if (!this.hasKeys()) {
      return false;
    }
    try {
      fs.statSync(this.uuidPath());
      return true;
    }
    catch(err) {
      if (err.code == 'ENOENT') {
        return false;
      }
      throw err;
    }
  }

  /*
   * Execute the registration process if the instance has not been registered,
   * otherwise just resolve the Promise
   *
   * @return Promise
   */
  async register() {
    let self = this;
    return new Promise(function(resolve, reject) {
      let api = self.app.service('registration');
      logger.info('Checking registration status..');
      if (self.hasKeys()) {
        logger.info('We have keys and a UUID already');
        this.loadKeysSync();
        this.loadUUIDSync();
        return self.login().then(res => resolve(res));
      }
      else {
        if (!self.generateKeys()) {
          return reject('Failed to generate keys');
        }
        if (!self.saveKeysSync()) {
          return reject('Failed to save keys to disk');
        }
        logger.info('Creating registration..');
        api.create({
          pubKey: self.getPublicKey(),
          curve: self.curve
        }).then((res) => {
          logger.info('Registration create:', res);
          self.uuid = res.uuid;
          if (!self.saveUUIDSync()) {
            reject('Failed to save UUID!');
          }
          else {
            return self.login().then(res => resolve(res));
          }
        }).catch((res) => {
          logger.error('Failed to register:', res);
          reject(res);
        });
      }
    });
  }

  /*
   * Execute the login process once the registration has completed.
   *
   * @return Promise
   */
  async login() {
    let api = this.app.service('authentication');
    let ec = new ecc.ec(this.curve);
    let key = ec.keyFromPrivate(this.privateKey, 'hex');
    let signature = key.sign(this.uuid);
    this.token = await api.create({
      uuid: this.uuid,
      signature: signature
    });
    logger.info('Logged in and received JWT:', this.token);
  }

  /*
   * Generate the keys necessary for this instance
   *
   * @return Boolean
   */
  generateKeys() {
    let ec = new ecc.ec(this.curve);
    let privkey = ec.genKeyPair();
    this.publicKey = privkey.getPublic('hex');
    this.privateKey = privkey.getPrivate('hex');

    /* If we have a private key, that's good enough! */
    if (this.privateKey) {
      return true;
    }

    return false;
  }

  /*
   * Return the base64 encoded public key associated with this instance
   *
   * Will return null if no public key has yet been generated
   *
   * @return String
   */
  getPublicKey() {
    return this.publicKey;
  }

  /*
   * Persist the UUID generated by the call to the registration service
   *
   * @return Boolean on success
   */
  saveUUIDSync() {
    if (this.uuid != null) {
      const config = {
        uuid: this.uuid,
      };
      logger.info('Saving uuid to disk at', this.uuidPath());

      fs.writeFileSync(
        this.uuidPath(),
        JSON.stringify(config),
        this.fileOptions);
      return true;
    }
    return false;
  }

  loadUUIDSync() {
    let config = fs.readFileSync(this.uuidPath(), this.fileOptions);
    this.uuid = config.uuid;
    return (!!this.uuid);
  }

  /*
   * Persist generated keys
   *
   * @return Boolean on success
   */
  saveKeysSync() {
    if ((!this.publicKey) || (!this.privateKey)) {
      logger.warn('saveKeysSync() called without a private or public key on Registration');
      return false;
    }

    const keyPath = this.keyPath();
    const publicKeyPath = this.publicKeyPath();
    const privateKeyPath = this.privateKeyPath();

    logger.debug('Writing public key to', publicKeyPath);
    fs.writeFileSync(publicKeyPath, this.publicKey, this.fileOptions);

    logger.debug('Writing private key to', privateKeyPath);
    fs.writeFileSync(privateKeyPath, this.privateKey, this.fileOptions);

    return true;
  }

  /*
   * Load generated keys from disk assuming they are present
   *
   * @return Boolean on successful load of keys
   */
  loadKeysSync() {
    if ((this.publicKey != null) || (this.privateKey != null)) {
      logger.warn('loadKeysSync() called despite public/private keys already having been loaded', this.publicKey);
      return false;
    }

    if (!this.hasKeys()) {
      return false;
    }
    this.publicKey = fs.readFileSync(this.publicKeyPath(), this.fileOptions);
    this.privateKey = fs.readFileSync(this.privateKeyPath(), this.fileOptions);
    return true;
  }


  /*
   * Returns the default home directory or the value of EVERGREEN_HOME
   */
  homeDirectory() {
    /* The default home directory is /evergreen, see the Dockerfile in the root
     * directory of th repository
     */
    if (!process.env.EVERGREEN_HOME) {
      return '/evergreen';
    }
    return process.env.EVERGREEN_HOME;
  }

  /*
   * Determine whether the keys are already present on the filesystem
   *
   * @return Boolean
   */
  hasKeys() {
    try {
      let r = fs.statSync(this.publicKeyPath());
      return true;
    }
    catch (err) {
      if (err.code == 'ENOENT') {
        return false;
      }
      else {
        throw err;
      }
    }
    return false;
  }

  /* Return the directory where registration keys should be stored
   *
   * @return String
   */
  keyPath() {
    const keys = [this.homeDirectory(), 'keys'].join(path.sep);

    /* Only bother making the directory if it doesn't already exist */
    try {
      const dirStat = fs.statSync(keys);
    }
    catch (err) {
      if (err.code == 'ENOENT') {
        mkdirp.sync(keys);
      }
      else {
        throw err;
      }
    }

    return keys;
  }

  /* Return the absolute path to the evergreen public key
   *
   * This public key is safe to be shared with external services
   *
   * @return String
   */
  publicKeyPath() {
    return [this.keyPath(), 'evergreen.pub'].join(path.sep)
  }

  privateKeyPath() {
    return [this.keyPath(), 'evergreen-private-key'].join(path.sep)
  }

  uuidPath() {
    return [this.keyPath(), 'uuid.json'].join(path.sep)
  }
}

module.exports = Registration