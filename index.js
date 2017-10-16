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
    const state = {
      complete: false,
      closed: false,
      suspended: false,
      stack,
    };
    map[id] = state;
    const handlers = {};
    const proxyMethod = (...methods) => {
      methods.forEach((method) => {
        handlers[method] = response[method];
        response[method] = (...args) => {
          if (state.suspended || state.complete) {
            return handlers[method].call(response, ...args);
          }
          stack.push({
            method,
            args,
          });
          const result = mockResponse[method].call(mockResponse, ...args);
          if (result === mockResponse) {
            return response;
          }
          return result;
        };
      });
    };
    proxyMethod(
      'status', 'links', 'location', 'set', 'type', 'vary', 'cookie', 'append',
      'attachment', 'json', 'jsonp', 'redirect', 'render', 'sendFile', 'sendStatus',
      'download', 'get', 'send',
    );
    mockResponse.on('end', () => {
      state.complete = true;
      if (!state.closed) {
        state.closed = true;
        executeStack(stack, response);
      }
    });
    setTimeout(() => {
      if (!state.closed) {
        state.closed = true;
        state.suspended = true;
        response.status(202).json({
          id,
        });
        state.suspended = false;
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
