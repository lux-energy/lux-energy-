const assert = require('node:assert/strict');
const test = require('node:test');

const databasePath = require.resolve('../src/config/database');
const controllerPath = require.resolve('../src/controllers/customerServiceController');

let state;
const db = {
  async query(sql, params) {
    state.queries.push({ sql, params });
    if (sql.includes('SELECT station_id FROM users WHERE id = ?')) {
      return [[state.agent ? { station_id: state.stationId } : undefined].filter(Boolean)];
    }
    if (sql.includes('FROM customer_services cs') && sql.includes('u.email AS customer_email')) {
      return [state.rows];
    }
    throw new Error(`Unexpected database query: ${sql}`);
  }
};

require.cache[databasePath] = {
  id: databasePath,
  filename: databasePath,
  loaded: true,
  exports: db,
  children: [],
  paths: []
};
delete require.cache[controllerPath];
const { getStationServices } = require(controllerPath);

const makeResponse = () => ({
  statusCode: 200,
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

test('lists recent services only for the active agent station', async () => {
  const serviceRows = [{ id: 8, customer_name: 'Customer', title: 'Energy service' }];
  state = { agent: true, stationId: 12, rows: serviceRows, queries: [] };
  const response = makeResponse();

  await getStationServices({ user: { id: 3 } }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, serviceRows);
  assert.equal(state.queries.length, 2);
  assert.deepEqual(state.queries[0].params, [3, 'agent', 'active']);
  assert.match(state.queries[1].sql, /WHERE cs\.station_id = \?/);
  assert.match(state.queries[1].sql, /ORDER BY cs\.updated_at DESC, cs\.id DESC/);
  assert.match(state.queries[1].sql, /LIMIT 100/);
  assert.deepEqual(state.queries[1].params, [12]);
});

test('does not expose services to agents without an assigned station', async () => {
  state = { agent: true, stationId: null, rows: [], queries: [] };
  const response = makeResponse();

  await getStationServices({ user: { id: 3 } }, response);

  assert.equal(response.statusCode, 403);
  assert.equal(state.queries.length, 1);
  assert.match(response.body.message, /not assigned to an active station/);
});
