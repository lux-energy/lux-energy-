const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const test = require('node:test');

process.env.JWT_SECRET = 'phone-registration-test-secret';

let state;
const codeHash = (code) => crypto
  .createHmac('sha256', process.env.JWT_SECRET)
  .update(code)
  .digest('hex');

const db = {
  async query() {
    throw new Error('Unexpected pool query');
  },
  async getConnection() {
    return {
      async beginTransaction() {},
      async commit() {},
      async rollback() {},
      release() {},
      async query(sql, params = []) {
        if (sql.includes('DELETE FROM pending_customer_phone_verifications')) {
          return [{ affectedRows: 0 }];
        }
        if (sql.includes('SELECT request_count,') && sql.includes('FROM pending_customer_phone_verifications')) {
          const recent = state.challenges
            .filter((challenge) => challenge.phone === params[0])
            .sort((left, right) => right.createdAt - left.createdAt)[0];
          return [recent ? [{
            request_count: recent.request_count,
            request_window_started_at: recent.request_window_started_at,
            within_window: 1,
            retry_after_seconds: 120
          }] : []];
        }
        if (sql.includes('SELECT id FROM users WHERE email = ? OR phone = ?')) {
          const [email, phone] = params;
          return [state.existingUsers
            .filter((user) => user.email === email || user.phone === phone)
            .map(({ id }) => ({ id }))];
        }
        if (sql.includes('SELECT id FROM admins WHERE email = ?')) {
          return [state.existingAdmins.filter((admin) => admin.email === params[0]).map(({ id }) => ({ id }))];
        }
        if (sql.includes('UPDATE pending_customer_phone_verifications') && sql.includes('SET used_at = NOW()')) {
          for (const challenge of state.challenges) {
            if (challenge.phone === params[0] && !challenge.used_at) challenge.used_at = new Date();
          }
          return [{ affectedRows: 1 }];
        }
        if (sql.includes('INSERT INTO pending_customer_phone_verifications')) {
          const challenge = {
            id: state.challenges.length + 1,
            challenge_id: params[0],
            name: params[1],
            email: params[2],
            password_hash: params[3],
            phone: params[4],
            delivery_channel: 'email',
            can_register: params[5],
            code_hash: params[6],
            attempts: 0,
            request_count: params[7],
            request_window_started_at: params[8] ? params[9] : new Date(),
            expires_at: new Date(Date.now() + 10 * 60 * 1000),
            used_at: null,
            createdAt: Date.now()
          };
          state.challenges.push(challenge);
          return [{ insertId: challenge.id }];
        }
        if (sql.includes('SELECT id, challenge_id') && sql.includes('FROM pending_customer_phone_verifications')) {
          const challenge = state.challenges.find((row) => row.challenge_id === params[0]);
          return [challenge && challenge.delivery_channel === 'email' ? [{
            ...challenge,
            within_window: 1,
            retry_after_seconds: 120,
            is_expired: challenge.expires_at <= new Date() ? 1 : 0
          }] : []];
        }
        if (sql.includes('SELECT id, email, phone, delivery_channel, attempts, request_count')) {
          const challenge = state.challenges.find((row) => row.challenge_id === params[0]);
          return [challenge ? [{
            ...challenge,
            within_window: 1,
            retry_after_seconds: 120,
            is_expired: challenge.expires_at <= new Date() ? 1 : 0
          }] : []];
        }
        if (sql.includes('UPDATE pending_customer_phone_verifications SET attempts = attempts + 1')) {
          const challenge = state.challenges.find((row) => row.id === params[0]);
          challenge.attempts += 1;
          return [{ affectedRows: 1 }];
        }
        if (sql.includes('INSERT INTO users')) {
          state.createdUsers.push({
            name: params[0],
            email: params[1],
            password: params[2],
            phone: params[3],
            email_verified_at: new Date(),
            phone_verified_at: null
          });
          return [{ insertId: state.createdUsers.length }];
        }
        if (sql.includes('SET used_at = NOW(), name = NULL')) {
          const challenge = state.challenges.find((row) => row.id === params[0]);
          challenge.used_at = new Date();
          challenge.name = null;
          challenge.email = null;
          challenge.password_hash = null;
          challenge.code_hash = '0'.repeat(64);
          return [{ affectedRows: 1 }];
        }
        if (sql.includes('SET code_hash = ?, attempts = 0')) {
          const challenge = state.challenges.find((row) => row.id === params[3]);
          challenge.code_hash = params[0];
          challenge.request_count = params[1];
          if (params[2] === 0) challenge.request_window_started_at = new Date();
          challenge.attempts = 0;
          challenge.expires_at = new Date(Date.now() + 10 * 60 * 1000);
          return [{ affectedRows: 1 }];
        }
        throw new Error(`Unexpected transaction query: ${sql}`);
      }
    };
  }
};

const installMock = (relativePath, exports) => {
  const filename = path.resolve(__dirname, relativePath);
  require.cache[filename] = {
    id: filename,
    filename,
    loaded: true,
    exports,
    children: [],
    paths: []
  };
};

installMock('../src/config/database.js', db);
installMock('../src/services/notificationService.js', {
  emailConfigured: () => true,
  emailMode: () => 'smtp',
  sendEmailOTP: async (email, code) => {
    state.sentTo.push(email);
    state.codesByEmail.set(email, code);
    return true;
  }
});

const {
  resendCustomerRegistrationCode,
  startCustomerRegistrationVerification,
  verifyCustomerRegistration
} = require('../src/controllers/customerRegistrationController');

const makeResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

const resetState = (overrides = {}) => {
  state = {
    challenges: [],
    existingUsers: [],
    existingAdmins: [],
    createdUsers: [],
    sentTo: [],
    codesByEmail: new Map(),
    ...overrides
  };
};

const registrationDetails = (overrides = {}) => ({
  name: 'New Customer',
  email: 'new.customer@example.com',
  passwordHash: 'bcrypt-hash-not-a-password',
  phone: '+250788123456',
  ...overrides
});

test('new customer account is created only after a valid email code', async () => {
  resetState();
  const delivery = await startCustomerRegistrationVerification(registrationDetails());
  const challenge = state.challenges[0];
  const code = state.codesByEmail.get('new.customer@example.com');

  assert.equal(delivery.email_sent, true);
  assert.deepEqual(state.sentTo, ['new.customer@example.com']);
  assert.equal(state.createdUsers.length, 0);
  assert.equal(challenge.phone, '+250788123456');
  assert.equal(challenge.code_hash, codeHash(code));
  assert.equal(challenge.code_hash.includes(code), false);
  assert.equal(challenge.expires_at > new Date(), true);

  const response = makeResponse();
  await verifyCustomerRegistration({
    body: { challenge_id: delivery.challenge_id, code }
  }, response);

  assert.equal(response.statusCode, 202);
  assert.equal(response.body.verification_complete, true);
  assert.equal(state.createdUsers.length, 1);
  assert.equal(state.createdUsers[0].phone, '+250788123456');
  assert.ok(state.createdUsers[0].email_verified_at);
  assert.equal(state.createdUsers[0].phone_verified_at, null);
  assert.equal(response.body.token, undefined);
});

test('legacy SMS registration challenges cannot create accounts', async () => {
  resetState();
  const delivery = await startCustomerRegistrationVerification(registrationDetails());
  const challenge = state.challenges[0];
  challenge.delivery_channel = 'sms';
  const response = makeResponse();

  await verifyCustomerRegistration({
    body: {
      challenge_id: delivery.challenge_id,
      code: state.codesByEmail.get(challenge.email)
    }
  }, response);

  assert.equal(response.statusCode, 400);
  assert.equal(state.createdUsers.length, 0);
});

test('registered and unregistered registration attempts have neutral responses and send only email codes', async () => {
  resetState({
    existingUsers: [{
      id: 7,
      email: 'saved@example.com',
      phone: '+250788123456'
    }]
  });

  const existing = await startCustomerRegistrationVerification(registrationDetails({
    email: 'another@example.com'
  }));
  const existingEmail = await startCustomerRegistrationVerification(registrationDetails({
    email: 'saved@example.com',
    phone: '+250788123458'
  }));
  const unknown = await startCustomerRegistrationVerification(registrationDetails({
    email: 'unknown@example.com',
    phone: '+250788123459'
  }));

  assert.equal(existing.message, unknown.message);
  assert.equal(existingEmail.message, unknown.message);
  assert.deepEqual(state.sentTo, ['another@example.com', 'saved@example.com', 'unknown@example.com']);
  assert.equal(state.challenges[0].can_register, 0);
  assert.equal(state.challenges[0].email, null);
  assert.equal(state.challenges[1].can_register, 0);

  const response = makeResponse();
  await verifyCustomerRegistration({
    body: {
      challenge_id: existing.challenge_id,
      code: state.codesByEmail.get('another@example.com')
    }
  }, response);

  assert.equal(response.statusCode, 202);
  assert.equal(response.body.message, 'If this email and phone can be used for an account, email verification is complete. Sign in or use password recovery to continue.');
  assert.equal(state.createdUsers.length, 0);
});

test('registration email challenge expires and rejects codes after five incorrect attempts', async () => {
  resetState();
  const delivery = await startCustomerRegistrationVerification(registrationDetails());
  const challenge = state.challenges[0];

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = makeResponse();
    await verifyCustomerRegistration({
      body: { challenge_id: delivery.challenge_id, code: '000000' }
    }, response);
    assert.equal(response.statusCode, 400);
  }
  const locked = makeResponse();
  await verifyCustomerRegistration({
    body: { challenge_id: delivery.challenge_id, code: state.codesByEmail.get(challenge.email) }
  }, locked);
  assert.equal(locked.statusCode, 400);
  assert.equal(challenge.attempts, 5);
  assert.equal(state.createdUsers.length, 0);

  const expired = await startCustomerRegistrationVerification(registrationDetails({ phone: '+250788123457', email: 'other@example.com' }));
  const expiredChallenge = state.challenges.at(-1);
  expiredChallenge.expires_at = new Date(Date.now() - 1);
  const expiredResponse = makeResponse();
  await verifyCustomerRegistration({
    body: {
      challenge_id: expired.challenge_id,
      code: state.codesByEmail.get(expiredChallenge.email)
    }
  }, expiredResponse);
  assert.equal(expiredResponse.statusCode, 400);
  assert.equal(state.createdUsers.length, 0);

  const resendResponse = makeResponse();
  await resendCustomerRegistrationCode({ body: { challenge_id: expired.challenge_id } }, resendResponse);
  assert.equal(resendResponse.body.email_sent, true);
  assert.ok(state.challenges.at(-1).expires_at > new Date());
});

test('email resend and registration are limited to three codes per phone in two minutes', async () => {
  resetState();
  const first = await startCustomerRegistrationVerification(registrationDetails());
  await resendCustomerRegistrationCode({ body: { challenge_id: first.challenge_id } }, makeResponse());
  await resendCustomerRegistrationCode({ body: { challenge_id: first.challenge_id } }, makeResponse());

  const registrationRetry = await startCustomerRegistrationVerification(registrationDetails());
  assert.ok(registrationRetry.retry_after_seconds > 0);

  const resendResponse = makeResponse();
  await resendCustomerRegistrationCode({ body: { challenge_id: first.challenge_id } }, resendResponse);
  assert.equal(resendResponse.statusCode, 429);
  assert.equal(state.sentTo.length, 3);
});
