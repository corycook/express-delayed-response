const LRU = require('lru-cache');
// const redis = require('redis').createClient();

/**
 * Creates a local in-memory LRU cache.
 * @param {LRU.Options} options The lru-cache options
 */
function createClient(options) {
  const cache = LRU(options);
  return {
    get(key, callback) {
      if (!callback || typeof callback !== 'function') {
        throw Error('No callback supplied to get.');
      }
      if (!cache.has(key)) {
        callback.call(null, null, null);
      } else {
        callback.call(null, null, cache.get(key));
      }
    },
    set(key, value, callback, maxAge) {
      const created = !cache.has(key);
      cache.set(key, value, maxAge);
      if (callback) {
        callback(null, created);
      }
    }
  };
}

module.exports = createClient;
