jest.mock('fs');

const assert       = require('assert');
const fs           = require('fs');
const path         = require('path');
const Registration = require('../src/lib/registration');

describe('The registration module', () => {
  beforeEach(() => {
    /* Make sure memfs is flushed every time */
    fs.volume.reset();
  });

  describe('register()', () => {
    it('should return a Promise', () => {
      const response = (new Registration()).register();
      assert(response instanceof Promise);
    });
  });

  describe('getPublicKey()', () => {
    it('should return null on a new instance', () => {
      const r = new Registration();
      assert.equal(null, r.getPublicKey());
    });

    it('should return a public key after generateKeys() has been called', () => {
      const r = new Registration();
      assert(r.generateKeys());
      assert.equal(typeof r.getPublicKey(), 'string');
    });
  });

  describe('saveUUIDSync()', () => {
    beforeEach(() => {
      this.reg = new Registration();
    });
    it('should not write anything by default', () => {
      assert.equal(this.reg.saveUUIDSync(), false);
    });

    describe('with a uuid', () => {
      beforeEach(() => {
        this.reg.uuid = 'foobar-uuid';
      });

      it('should write a uuid.json', () => {
        assert(this.reg.saveUUIDSync());
        try {
          fs.statSync(this.reg.uuidPath());
        }
        catch (err) {
          if (err.code == 'ENOENT') {
            assert.fail('Could not find the uuid saved on disk');
          }
          else {
            throw err;
          }
        }
      });
    });
  });

  describe('loadUUIDSync()', () => {
    let uuid = 'just another-fake-uuid';
    beforeEach(() => {
      this.reg = new Registration();
      this.reg.uuid = uuid;
      this.reg.saveUUIDSync();
    });

    it('should be able to load the UUID from disk', () => {
      this.reg.uuid = null;
      this.reg.loadUUIDSync();
      assert.equal(this.reg.uuid, uuid);
    });
  });

  describe('saveKeysSync()', () => {
    it('should return false if there are not keys', () => {
      const r = new Registration();
      assert(!r.saveKeysSync());
    });

    describe('when keys have been generated', () => {
      beforeEach(() => {
        this.reg = new Registration();
        this.reg.generateKeys();
      });
      it('should return true if the public key has been written', () => {
        assert(this.reg.saveKeysSync());
        try {
          fs.statSync(this.reg.publicKeyPath());
        }
        catch (err) {
          assert.fail('The public key was not written properly');
        }

        try {
          const privateKeyPath = [this.reg.keyPath(),
            'evergreen-private-key'].join(path.sep);

          fs.statSync(privateKeyPath);
        }
        catch (err) {
          assert.fail('The private key was not written properly');
        }
      });
    });
  });

  describe('loadKeysSync()', () => {
    beforeEach(() => {
      this.reg = new Registration();
    });

    it('should return false by default when there are no keys', () => {
      assert.equal(this.reg.loadKeysSync(), false);
    });

    it('should return false if keys have already been generated', () => {
      this.reg.generateKeys();
      assert.equal(this.reg.loadKeysSync(), false);
    });

    describe('when keys are already on disk', () => {
      beforeEach(() => {
        const preflight = new Registration();
        preflight.generateKeys();
        preflight.saveKeysSync();
      });

      it('should return true and have keys loaded if they are on disk', () => {
        assert(this.reg.loadKeysSync());
        assert.equal(typeof this.reg.getPublicKey(), 'string');
      });
    });
  });

  describe('hasKeys()', () => {
    it('should return false by default', () => {
      assert.equal((new Registration()).hasKeys(), false);
    });
  });

  describe('generateKeys()', () => {
    it('should return a boolean on success', () => {
      assert.ok((new Registration()).generateKeys());
    });
  });

  describe('publicKeyPath()', () => {
    it('should return a path', () => {
      const p = (new Registration()).publicKeyPath();
      assert(p != path.basename(p), 'This doesn\'t look like a path');
    });
  });

  describe('keyPath()', () => {
    it('should return a path', () => {
      const keys = (new Registration()).keyPath();
      assert(keys != path.basename(keys), 'This doesn\'t look like a path');
    });

    it('should create a directory if one does not exist', () => {
      const keyPath = (new Registration()).keyPath();
      const stats = fs.statSync(keyPath);
      assert(stats.isDirectory());
    });

    it('should not exist by default', () => {
      /* this is really a test to make sure memfs is behaving appropriately */
      try {
        fs.statSync('/evergreen/keys');
      }
      catch (err) {
        assert.equal(err.code, 'ENOENT');
      }
    });
  });

  describe('homeDirectory()', () => {
    it('should return a path', () => {
      const p = (new Registration()).homeDirectory();
      assert(p != path.basename(p), 'This doesn\'t look like a path');
    });
  });

  describe('uuidPath()', () => {
    it('should return a path', () => {
      const p = (new Registration()).uuidPath();
      assert(p != path.basename(p), 'This doesn\'t look like a path');
    });
  });

});
