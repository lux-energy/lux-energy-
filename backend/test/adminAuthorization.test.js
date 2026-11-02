const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'route-authorization-test-secret';

const protectedRoutes = [
  { name: 'station management', path: '/stations', method: 'POST', url: '/' },
  { name: 'product management', path: '/products', method: 'POST', url: '/' },
  { name: 'service management', path: '/services', method: 'POST', url: '/' },
  { name: 'news management', path: '/news', method: 'POST', url: '/' },
  { name: 'career management', path: '/careers', method: 'POST', url: '/' },
  { name: 'contact message management', path: '/contact', method: 'GET', url: '/' },
  { name: 'dashboard statistics', path: '/dashboard', method: 'GET', url: '/stats' }
];

test('management routes reject authenticated agents', async (t) => {
  const app = express();
  for (const route of protectedRoutes) {
    app.use(route.path, require(`../src/routes/${route.path.slice(1)}`));
  }

  const server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  try {
    const { port } = server.address();
    const token = jwt.sign({ id: 1, role: 'agent' }, process.env.JWT_SECRET);

    for (const route of protectedRoutes) {
      await t.test(route.name, async () => {
        const response = await fetch(`http://127.0.0.1:${port}${route.path}${route.url}`, {
          method: route.method,
          headers: { Authorization: `Bearer ${token}` }
        });
        assert.equal(response.status, 403);
      });
    }
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
