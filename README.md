# express-delayed-response
[![Build Status](https://travis-ci.org/corycook/express-delayed-response.svg?branch=master)](https://travis-ci.org/corycook/express-delayed-response)
[![Coverage Status](https://coveralls.io/repos/github/corycook/express-delayed-response/badge.svg?branch=master)](https://coveralls.io/github/corycook/express-delayed-response?branch=master)

Break long running processes into multiple requests with a status end point.

## delay

Use `delay` middleware to automatically provide polling and status functionality to following handlers.

```javascript
const { delay } = require('express-delayed-response');

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
const { status } = require('express-delayed-response');

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
