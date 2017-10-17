const express = require('express');
const {
  delay,
  status,
} = require('../index');
const request = require('supertest');
const assert = require('assert');

function timer(millis) {
  return new Promise((resolve) => {
    setTimeout(resolve, millis);
  });
}

const app = express();
const options = {
  timeout: 100,
};

app.get('/status/:id', status());

app.use(delay(options));

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

app.get('/cookie', (req, res) => {
  setTimeout(() => {
    res.cookie('test', 'test').send();
  }, 200);
});

describe('express-delayed-response', () => {
  const source = request(app);

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
});
