const assert = require('assert');
const cacheClient = require('redis-mock').createClient();
const edr = require('../src/index');
const express = require('express');
const lolex = require('lolex');
const request = require('supertest');

const SLOW_RESPONSE_TIME = 200;
const DELAY_TIMEOUT = 100;

testIndex('express-delayed-response', () => edr.init());
testIndex(
    'express-delayed-response with Redis cache client',
    () => edr.init({cacheClient}));

function testIndex(title, createUnderTest) {
  describe(title, () => {
    let clock;

    beforeEach(() => {
      clock = lolex.install({shouldAdvanceTime: true});
    });

    afterEach(() => {
      clock.uninstall();
    });

    it('should not throw error with default values', () => {
      const {delay} = createUnderTest();
      assert.doesNotThrow(delay);
    });

    const STATUS_CODES =
        [200, 201, 202, 203, 400, 401, 402, 403, 404, 500, 501, 502, 503, 504];

    for (let statusCode of STATUS_CODES) {
      it(`should return ${statusCode}`, async () => {
        const app = createApp();
        app.get('/quick', (req, res) => {
          res.sendStatus(statusCode);
        });
        const source = request(app);

        return source.get('/quick').expect(statusCode);
      });
    }

    it('should respond 202 for long responses then eventually resolve',
       async () => {
         const source = createSlowAppRequest();

         const response = await source.get('/slow').expect(202);
         assert(response.body && response.body.id);
       });

    function createSlowAppRequest() {
      const app = createApp();
      app.get('/slow', (req, res) => {
        setTimeout(() => {
          res.sendStatus(200);
        }, SLOW_RESPONSE_TIME);
      });
      return request(app);
    }

    it('should respond 202 on initial status query', async () => {
      const source = createSlowAppRequest();

      const response = await source.get('/slow').expect(202);
      assert(response.body && response.body.id);
      return source.get(`/status/${response.body.id}`).expect(202);
    });

    it('should respond 200 on status complete for long operation', async () => {
      const source = createSlowAppRequest();

      const response = await source.get('/slow').expect(202);
      clock.tick(100);
      return source.get(`/status/${response.body.id}`).expect(200);
    });

    it('should set cookies', async () => {
      const app = createApp();
      app.get('/cookie', (req, res) => {
        setTimeout(() => {
          res.cookie('test', 'test').send();
        }, SLOW_RESPONSE_TIME);
      });
      const source = request(app);

      const response = await source.get('/cookie').expect(202);
      clock.tick(SLOW_RESPONSE_TIME);
      return source.get(`/status/${response.body.id}`)
          .expect(200)
          .expect('set-cookie', 'test=test; Path=/');
    });

    it('should return 404 if requesting non-existent status id', () => {
      const app = createApp();
      const source = request(app);

      return source.get('/status/null').expect(404);
    });

    it('should update progress indicator', async () => {
      const app = createApp();
      app.get('/progress', (req, res) => {
        setTimeout(() => {
          res.progress({pct: 50});
          setTimeout(() => {
            res.json({message: 'success'});
          }, 100);
        }, SLOW_RESPONSE_TIME);
      });
      const source = request(app);

      const response = await source.get('/progress').expect(202);
      clock.tick(100);
      return source.get(`/status/${response.body.id}`).expect(202).expect({
        id: response.body.id,
        progress: {pct: 50},
      });
    });

    it('there should not be race conditions', async () => {
      const app = createApp();
      app.get('/exact', (req, res) => {
        setTimeout(() => {
          res.json({message: 'success'});
        }, DELAY_TIMEOUT);
      });
      const source = request(app);

      const response = await source.get(`/exact`).expect(202);
      clock.tick(200);
      return source.get(`/status/${response.body.id}`).expect(200);
    });
  });

  function createApp() {
    const {delay, status} = createUnderTest();
    const app = express();
    app.get('/status/:id', status());
    app.use(delay({timeout: DELAY_TIMEOUT}));
    return app;
  }
}
