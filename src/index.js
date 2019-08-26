const shortid = require('shortid');
const {createResponse} = require('node-mocks-http');
const events = require('events');
const createClient = require('./createClient');
const CacheSettingTracker = require('./CacheSettingTracker');

function executeStack(stack, response, thisArg = response) {
  stack.forEach((item) => {
    response[item.method].call(thisArg, ...item.args);
  });
}

const proxyMethods = [
  'append', 'attachment', 'cookie',     'download', 'end',       'get',
  'json',   'jsonp',      'links',      'location', 'redirect',  'render',
  'send',   'sendFile',   'sendStatus', 'set',      'setHeader', 'status',
  'type',   'write',      'vary',
];

function expressDelayedResponse({
  cacheClient = createClient({max: 5000}),
  cacheKey = 'express-delayed-response',
  cacheExpire = 3600000,
} = {}) {
  const tracker = new CacheSettingTracker();
  return {
    delay({timeout = 5000} = {}) {
      return (req, response, next) => {
        const mockResponse =
            createResponse({eventEmitter: events.EventEmitter});
        const id = shortid.generate();
        const stack = [];
        const state = {
          complete: false,
          stack,
        };
        const handlers = {};
        updateCache();

        let suspended = false;

        proxyMethods.forEach((method) => {
          handlers[method] = response[method];
          response[method] = (...args) => {
            if (state.complete || suspended) {
              return handlers[method].call(response, ...args);
            }
            stack.push({method, args});
            const result = mockResponse[method].call(mockResponse, ...args);
            return result === mockResponse ? response : result;
          };
        });
        response.progress = function progress(status) {
          state.progress = status;
          updateCache();
        };
        mockResponse.on('end', () => {
          state.complete = true;
          if (!response.headersSent) {
            executeStack(stack, response);
          } else {
            updateCache();
          }
        });
        setTimeout(() => {
          if (!response.headersSent) {
            suspended = true;
            response.status(202).json({id});
            suspended = false;
          }
        }, timeout);
        next();

        function updateCache() {
          tracker.start();
          cacheClient.set(
              `${cacheKey}-${id}`, JSON.stringify(state), 'PX', cacheExpire,
              () => tracker.complete());
        }
      };
    },
    status({resolveID = req => req.params.id} = {}) {
      return (req, res) => {
        const id = resolveID(req);
        tracker.current.then(() => {
          cacheClient.get(`${cacheKey}-${id}`, (err, cacheItem) => {
            const state = cacheItem && JSON.parse(cacheItem);
            if (state && state.complete) {
              executeStack(state.stack, res);
            } else if (state) {
              res.status(202).json({id, progress: state.progress});
            } else {
              res.sendStatus(404);
            }
          });
        });
      };
    },
  };
}

module.exports = {
  init: expressDelayedResponse,
  createCacheClient: createClient,
};
