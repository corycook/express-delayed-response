const LRU = require('lru-cache');

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
        callback(null, null);
      } else {
        callback(null, cache.get(key));
      }
    },
    set(key, value, mode, maxAge, callback) {
      const created = !cache.has(key);
      cache.set(key, value, maxAge);
      if (callback) {
        callback(null, created);
      }
    },
  };
}

module.exports = createClient;
