const createClient = require('../src/lib/createClient');
const shortid = require('shortid');
const assert = require('assert');

describe('Test createClient', () => {
  const appKey = shortid.generate();
  const client = createClient();
  const value = {
    value: shortid.generate(),
  };

  it('should save object by id', (done) => {
    client.set(appKey, value);
    client.set(appKey, value, 'PX', 1000, () => {
      client.get(appKey, (err, res) => {
        assert.deepEqual(res, value);
        done();
      });
    });
  });

  it('should respond null if key does not exist', (done) => {
    client.get('null', (err, res) => {
      assert(res === null);
      done();
    });
  });

  it('should throw error if callback is not supplied to get', () => {
    assert.throws(() => client.get(appKey), /callback/);
  });
});
