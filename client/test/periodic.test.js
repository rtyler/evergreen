const assert   = require('assert');
const periodic = require('../src/lib/periodic');

describe('The periodic module', () => {
  /* Just a simple fake app for unit test
   */
  let app = new Object();

  describe('runHourly()', () => {
    it('allow registration of an hourly callback', () => {
      let p = periodic(app);
      assert.ok(p.runHourly('jest-fun', () => { }));
    });
  });

  describe('runDaily()', () => {
    it('allows registration of a daily callback', () => {
      let p = periodic(app);
      assert.ok(p.runDaily('jest-fun', () => { }));
    });
  });

  describe('computeOffset()', () => {
    let p = periodic(app);

    it('should return a number between 0-59', () => {
      let offset = p.computeOffset();
      assert.equal(typeof offset, 'number');
      assert.ok(offset <= 59);
      assert.ok(offset >= 0);
    });
  });
});
