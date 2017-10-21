const shortid = require('shortid');
const {
  createResponse,
} = require('node-mocks-http');
const events = require('events');
const createClient = require('./lib/createClient');

function executeStack(stack, response, thisArg = response) {
  stack.forEach((item) => {
    response[item.method].call(thisArg, ...item.args);
  });
}

const proxyMethods = [
  'status', 'links', 'location', 'set', 'type', 'vary', 'cookie', 'append',
  'attachment', 'json', 'jsonp', 'redirect', 'render', 'sendFile', 'sendStatus',
  'download', 'get', 'send',
];

function expressDelayedResponse({
  cacheClient = createClient({ max: 5000 }),
  cacheKey = 'express-delayed-response',
} = {}) {
  return {
    delay({ timeout = 5000 } = {}) {
      return (req, response, next) => {
        const mockResponse = createResponse({
          eventEmitter: events.EventEmitter,
        });
        const id = shortid.generate();
        const stack = [];
        const state = {
          complete: false,
          stack,
        };
        const handlers = {};
        cacheClient.hset(cacheKey, id, JSON.stringify(state));

        let closed = false;
        let suspended = false;

        proxyMethods.forEach((method) => {
          handlers[method] = response[method];
          response[method] = (...args) => {
            if (state.complete || suspended) {
              return handlers[method].call(response, ...args);
            }
            stack.push({ method, args });
            const result = mockResponse[method].call(mockResponse, ...args);
            return result === mockResponse ? response : result;
          };
        });
        response.progress = function progress(status) {
          state.progress = status;
          cacheClient.hset(cacheKey, id, JSON.stringify(state));
        };
        mockResponse.on('end', () => {
          state.complete = true;
          if (!closed) {
            closed = true;
            executeStack(stack, response);
          } else {
            cacheClient.hset(cacheKey, id, JSON.stringify(state));
          }
        });
        setTimeout(() => {
          if (!closed) {
            closed = true;
            suspended = true;
            response.status(202).json({ id });
            suspended = false;
          }
        }, timeout);
        next();
      };
    },
    status({ resolveID = req => req.params.id } = {}) {
      return (req, res) => {
        const id = resolveID(req);
        cacheClient.hget(cacheKey, id, (err, cacheItem) => {
          const state = cacheItem && JSON.parse(cacheItem);
          if (state && state.complete) {
            executeStack(state.stack, res);
          } else if (state) {
            res.status(202).json({ id, progress: state.progress });
          } else {
            res.sendStatus(404);
          }
        });
      };
    },
  };
}

module.exports = {
  init: expressDelayedResponse,
  createCacheClient: createClient,
};
