# express-delayed-response
[![npm version](https://badge.fury.io/js/express-delayed-response.svg)](https://badge.fury.io/js/express-delayed-response)
[![Build Status](https://travis-ci.org/corycook/express-delayed-response.svg?branch=master)](https://travis-ci.org/corycook/express-delayed-response)
[![Coverage Status](https://coveralls.io/repos/github/corycook/express-delayed-response/badge.svg?branch=master)](https://coveralls.io/github/corycook/express-delayed-response?branch=master)

Break long running processes into multiple requests with a status end point.

## delay

Use `delay` middleware to automatically provide polling and status functionality to following handlers.

```javascript
const { delay } = require('express-delayed-response').init();

app.get('/path', delay(), potentiallySlowHandler);
``` 

### delay.timeout

By default `delay` will respond within 5 seconds, either with the handler response or a `202 Accepted` response. This can be modified with the `timeout` option.

```javascript
// provide the timeout in milliseconds (wait 30 seconds)
app.get('/path', delay({ timeout: 30000 }), potentiallySlowHandler);
```

## status

Use `status` middleware to query operation status and get cached responses.

If the operation is still processing then it will return a `202 Accepted` response; otherwise, it will return the cached response from the initial operation.

```javascript
const { status } = require('express-delayed-response').init();

app.get('/status/:id', status());
```

### status.resolveID

By default, `status` uses the `id` path parameter to resolve the id of the status object to query against. To override this behavior 
provide a `resolveID` method to the options.

```javascript
app.get('/status', status({
    resolveID: req => req.headers['X-STATUS-ID']
}));
```

## Redis Support

By default an in-memory LRU cache with 5000 entries is used to store the responses. If needed, a Redis client can be used as the
cache client in place of the LRU cache.

```javascript
const redis = require('redis');
const { delay, status } = require('express-delayed-response').init({ cacheClient: redis.createClient() });
```

The values are stored in a hash with the key `express-delayed-response` to customize this key supply the `cacheKey` option to `init`

```javascript
const { delay, status } = require('express-delayed-response').init({ 
    cacheClient: redis.createClient(), 
    cacheKey: 'delay-key',
});
```

## Set LRU options

If working in a limited memory environment, it may be necessary to control the LRU cache. Use `createCacheClient` to supply options 
to the lru-cache instance used.

```javascript
const delayedResponse = require('express-delayed-response');

const { delay, status } = delayedResponse.init({ 
    cacheClient: delayedResponse.createCacheClient({ 
        max: 500,
    }),
});
```

The cache client uses [`lru-cache`](https://www.npmjs.com/package/lru-cache) and the options are passed directly to the LRU instace created.
