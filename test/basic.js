const express = require('express');
const cacheClient = require('redis').createClient();
const {
  delay,
  status,
} = require('../src/index').init({ cacheClient });
const request = require('supertest');
const assert = require('assert');

function timer(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const app = express();

app.get('/status/:id', status());

app.use(delay({
  timeout: 100,
}));

app.get('/quick/:responseCode', (req, res) => {
  res.sendStatus(Number.parseInt(req.params.responseCode, 10));
});

app.get('/slow', (req, res) => {
  setTimeout(() => {
    res.status(200).json({
      message: 'success',
    });
  }, 200);
});

app.get('/exact/:delay', (req, res) => {
  setTimeout(() => {
    res.json({
      message: 'success',
    });
  }, parseInt(req.params.delay, 10));
});

app.get('/cookie', (req, res) => {
  setTimeout(() => {
    res.cookie('test', 'test').send();
  }, 200);
});

const progressPayload = {
  percentComplete: 50,
  message: 'Already half way there!',
};

app.get('/progress', (req, res) => {
  setTimeout(() => {
    res.progress(progressPayload);
    setTimeout(() => {
      res.json({ message: 'success' });
    }, 100);
  }, 200);
});

describe('express-delayed-response', () => {
  const source = request(app);

  after((done) => {
    cacheClient.quit(done);
  });

  it('should not throw error with default values', () => {
    assert.doesNotThrow(delay);
  });

  [200, 201, 202, 203, 400, 401, 402, 403, 404, 500, 501, 502, 503, 504].forEach((statusCode) => {
    it(`should return ${statusCode}`, () => source.get(`/quick/${statusCode}`).expect(statusCode));
  });

  it('should respond 202 for long responses then eventually resolve', () => (
    source.get('/slow').expect(202).then((response) => {
      assert(response.body && response.body.id);
    })
  ));

  it('should respond 202 on initial status query', () => (
    source.get('/slow').expect(202).then((response) => {
      assert(response.body && response.body.id);
      return source.get(`/status/${response.body.id}`).expect(202);
    })
  ));

  it('should respond 200 on status complete for long operation', () => (
    source.get('/slow').expect(202).then(response => timer(100).then(() => (
      source.get(`/status/${response.body.id}`).expect(200)
    ))).then((response) => {
      assert(response.body && response.body.message);
    })
  ));

  it('should set cookies', () => (
    source.get('/cookie').expect(202).then(response => timer(100).then(() => (
      source.get(`/status/${response.body.id}`).expect(200).expect('set-cookie', 'test=test; Path=/')
    )))
  ));

  it('should return 404 if requesting non-existent status id', () => (
    source.get('/status/null').expect(404)
  ));

  it('should update progress indicator', () => (
    source.get('/progress').expect(202).then(response => timer(100).then(() => (
      source.get(`/status/${response.body.id}`).expect(202).expect({ id: response.body.id, progress: progressPayload })
    )))
  ));

  for (let ms = 80; ms <= 110; ms += 2) {
    it(`there should not be race conditions (delay: ${ms})`, () => (
      source.get(`/exact/${ms}`).then((response) => {
        if (response.status === 202) {
          return timer(20).then(() => source.get(`/status/${response.body.id}`).expect(200));
        }
        return assert.equal(response.status, 200);
      })
    ));
  }
});
