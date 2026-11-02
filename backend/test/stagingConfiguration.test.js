const assert = require('node:assert/strict');
const { after, test } = require('node:test');
const path = require('node:path');

process.env.CORS_ALLOWED_ORIGINS = 'https://staging.luxenergy.com';
const app = require('../src/app');
const server = app.listen(0);

const requestPreflight = (origin) => new Promise((resolve, reject) => {
  const address = server.address();
  const request = require('node:http').request({
    hostname: '127.0.0.1',
    port: address.port,
    method: 'OPTIONS',
    path: '/api/health',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'GET'
    }
  }, (response) => {
    response.resume();
    response.on('end', () => resolve(response.headers));
  });
  request.on('error', reject);
  request.end();
});

after(() => new Promise((resolve, reject) => {
  server.close((error) => error ? reject(error) : resolve());
}));

test('allows the configured staging frontend origin', async () => {
  const headers = await requestPreflight('https://staging.luxenergy.com');
  assert.equal(headers['access-control-allow-origin'], 'https://staging.luxenergy.com');
});

test('does not grant CORS access to an unlisted origin', async () => {
  const headers = await requestPreflight('https://untrusted.invalid');
  assert.equal(headers['access-control-allow-origin'], undefined);
});

test('uses separate public and private upload directories', () => {
  const { uploadsDirectory, privateUploadsDirectory } = require('../src/config/storage');
  assert.equal(path.basename(uploadsDirectory), 'uploads');
  assert.equal(path.basename(privateUploadsDirectory), 'private_uploads');
  assert.notEqual(uploadsDirectory, privateUploadsDirectory);
});
