const shortid = require('shortid');
const {
  createResponse,
} = require('node-mocks-http');
const events = require('events');

const map = {};

function executeStack(stack, response, thisArg = response) {
  stack.forEach((item) => {
    response[item.method].call(thisArg, ...item.args);
  });
}

function delay({
  timeout = 5000,
} = {}) {
  return (req, response, next) => {
    const mockResponse = createResponse({
      eventEmitter: events.EventEmitter,
    });
    const id = shortid.generate();
    const stack = [];
    let closed = false;
    let suspended = false;
    const state = {
      complete: false,
      stack,
    };
    map[id] = state;
    const handlers = {};
    const proxyMethod = (...methods) => {
      methods.forEach((method) => {
        handlers[method] = response[method];
        response[method] = (...args) => {
          if (state.complete || suspended) {
            return handlers[method].call(response, ...args);
          }
          stack.push({
            method,
            args,
          });
          const result = mockResponse[method].call(mockResponse, ...args);
          return result === mockResponse ? response : result;
        };
      });
    };
    proxyMethod(
      'status', 'links', 'location', 'set', 'type', 'vary', 'cookie', 'append',
      'attachment', 'json', 'jsonp', 'redirect', 'render', 'sendFile', 'sendStatus',
      'download', 'get', 'send' // eslint-disable-line comma-dangle
    );
    mockResponse.on('end', () => {
      state.complete = true;
      if (!closed) {
        closed = true;
        executeStack(stack, response);
      }
    });
    setTimeout(() => {
      if (!closed) {
        closed = true;
        suspended = true;
        response.status(202).json({
          id,
        });
        suspended = false;
      }
    }, timeout);
    next();
  };
}

function status({
  resolveID = req => req.params.id,
} = {}) {
  return (req, res) => {
    const id = resolveID(req);
    const state = map[id];
    if (state && state.complete) {
      executeStack(state.stack, res);
    } else if (state) {
      res.status(202).json({
        id,
      });
    } else {
      res.sendStatus(404);
    }
  };
}

module.exports = {
  delay,
  status,
};
