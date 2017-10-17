const createClient = require('../lib/createClient');
const shortid = require('shortid');
const assert = require('assert');

describe('Test createClient', () => {
  const appKey = shortid.generate();
  const client = createClient();
  const field = shortid.generate();
  const value = {
    value: shortid.generate(),
  };

  it('should save object by id', (done) => {
    client.hset(appKey, field, value);
    client.hset(appKey, field, value, () => {
      client.hget(appKey, field, (err, res) => {
        assert.deepEqual(res, value);
        done();
      });
    });
  });

  it('should respond null if key does not exist', (done) => {
    client.hget(appKey, 'null', (err, res) => {
      assert(res === null);
      done();
    });
  });

  it('should throw error if callback is not supplied to hget', () => {
    assert.throws(() => client.hget(appKey, field), /callback/);
  });
});
