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
        callback(null, null, null);
      } else {
        callback(null, null, cache.get(key));
      }
    },
    set(key, value, callback, maxAge) {
      const created = !cache.has(key);
      // maxAge for lru-cache is defined in ms
      cache.set(key, value, maxAge * 1000);
      if (callback) {
        callback(null, created);
      }
    }
  };
}

module.exports = createClient;
