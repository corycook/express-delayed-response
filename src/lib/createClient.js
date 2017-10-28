const LRU = require('lru-cache');
// const redis = require('redis').createClient();

/**
 * Creates a local in-memory LRU cache.
 * @param {LRU.Options} options The lru-cache options
 */
function createClient(options) {
  const cache = LRU(options);
  return {
    hget(key, field, callback) {
      if (!callback) {
        throw Error('No callback supplied to hget.');
      }
      if (!cache.has(field)) {
        callback(null, null);
      } else {
        callback(null, cache.get(field));
      }
    },
    hset(key, field, value, callback) {
      const created = !cache.has(field);
      cache.set(field, value);
      if (callback) {
        callback(null, created);
      }
    },
  };
}

module.exports = createClient;
