const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const test = require('node:test');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'customer-verification-test-secret';

let state;
const verificationDate = new Date('2026-10-19T08:00:00.000Z');
const makeCodeHash = (code) => crypto
  .createHmac('sha256', process.env.JWT_SECRET)
  .update(code)
  .digest('hex');

const db = {
  async query(sql, params) {
    if (sql.includes('SELECT status, verification_status, email_verified_at, phone_verified_at FROM users')) {
      return [[{
        status: state.user.status,
        verification_status: state.user.verification_status,
        email_verified_at: state.user.email_verified_at,
        phone_verified_at: state.user.phone_verified_at
      }]];
    }
    if (sql.includes('UPDATE customer_verification_codes SET used_at = NOW() WHERE id = ?')) {
      if (state.code?.id === params[0]) {
        state.code.used_at = new Date();
        state.supersededCode = state.code;
      }
      return [{ affectedRows: state.code?.id === params[0] ? 1 : 0 }];
    }
    if (sql.includes('SELECT id FROM users WHERE email = ? OR phone = ?')) return [[]];
    if (sql.includes('SELECT id FROM admins WHERE email = ?')) return [[]];
    if (sql.includes('INSERT INTO users (name, email, password, phone, role, status, verification_status)')) {
      state.user = makeUser({
        id: 42,
        name: params[0],
        email: params[1],
        password: params[2],
        phone: params[3]
      });
      return [{ insertId: state.user.id }];
    }
    if (sql.includes('SELECT email_verified_at, phone_verified_at FROM users WHERE id = ?')) {
      return [[{
        email_verified_at: state.user.email_verified_at,
        phone_verified_at: state.user.phone_verified_at
      }]];
    }
    if (sql.includes('SELECT COUNT(*) AS count FROM customer_verification_codes')) {
      return [[{ count: state.code?.channel === params[1] ? 1 : 0 }]];
    }
    if (sql.includes('SELECT * FROM users WHERE email = ? AND role = ?')) {
      return [[{ ...state.user }]];
    }
    if (sql.includes("UPDATE users SET verification_status = 'verified'")) {
      state.user.verification_status = 'verified';
      return [{ affectedRows: 1 }];
    }
    throw new Error(`Unexpected database query: ${sql}`);
  },
  async getConnection() {
    return {
      async beginTransaction() {},
      async commit() {
        state.commits += 1;
      },
      async rollback() {
        state.rollbacks += 1;
      },
      release() {},
      async query(sql, params) {
        if (sql.includes('UPDATE customer_verification_codes SET used_at = NOW()')) {
          if (state.code?.channel === params[1]) state.code.used_at = new Date();
          return [{ affectedRows: state.code ? 1 : 0 }];
        }
        if (sql.includes('INSERT INTO customer_verification_codes')) {
          state.insertSql = sql;
          state.code = {
            id: 10,
            code_hash: params[1],
            channel: params[2],
            attempts: 0,
            used_at: null,
            is_expired: false
          };
          return [{ insertId: state.code.id }];
        }
        if (sql.includes('FROM users WHERE email = ?')) {
          return [[{ ...state.user }]];
        }
        if (sql.includes('FROM customer_verification_codes')) {
          if (!state.code) return [[]];
          const channel = params[2] || 'email';
          const verifiedAt = channel === 'sms'
            ? state.user.phone_verified_at
            : state.user.email_verified_at;
          return [[{
            ...state.code,
            is_expired: state.code.is_expired ? 1 : 0,
            used_for_verification: Boolean(
              state.code.used_at
              && verifiedAt
              && state.code.used_at.getTime() === verifiedAt.getTime()
            )
          }]];
        }
        if (sql.includes('UPDATE customer_verification_codes SET attempts')) {
          state.code.attempts = params[0];
          return [{ affectedRows: 1 }];
        }
        if (sql.includes('SET email_verified_at = COALESCE') || sql.includes('SET phone_verified_at = COALESCE')) {
          const column = sql.includes('phone_verified_at') ? 'phone_verified_at' : 'email_verified_at';
          state.user[column] = state.user[column] || verificationDate;
          state.user.verification_status = 'verified';
          return [{ affectedRows: 1 }];
        }
        if (sql.includes('SET used_at = (SELECT')) {
          const column = sql.includes('phone_verified_at') ? 'phone_verified_at' : 'email_verified_at';
          state.code.used_at = state.user[column];
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
  emailMode: () => 'test',
  normalizeSmsPhone: (phone) => phone,
  smsConfigured: () => Boolean(state.smsConfigured),
  sendEmailOTP: async (email, code) => {
    state.sentCode = code;
    state.sentChannel = 'email';
    return true;
  },
  sendSmsOTP: async (phone, code) => {
    state.sentCode = code;
    state.sentPhone = phone;
    state.sentChannel = 'sms';
    if (state.smsError) throw state.smsError;
    return true;
  }
});
installMock('../src/middleware/validation.js', {
  passwordMeetsPolicy: () => true
});
installMock('../src/controllers/customerRegistrationController.js', {
  startCustomerRegistrationVerification: async (details) => {
    if (state.registrationError) throw state.registrationError;
    state.stagedRegistration = details;
    return {
      challenge_id: '123e4567-e89b-12d3-a456-426614174000',
      email_sent: true,
      email_mode: 'smtp',
      retry_after_seconds: 0,
      message: 'If this email and phone can be used for registration, a verification code will be sent to your email.'
    };
  }
});

const { startCustomerVerification, verifyCustomerContacts } = require('../src/controllers/customerVerificationController');
const { loginCustomer, registerCustomer } = require('../src/controllers/authController');
const authMiddleware = require('../src/middleware/auth');

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

const makeUser = (overrides = {}) => ({
  id: 42,
  name: 'Test Customer',
  email: 'customer@example.com',
  password: '',
  phone: '+250788123456',
  role: 'customer',
  station_id: null,
  status: 'active',
  verification_status: 'pending',
  email_verified_at: null,
  phone_verified_at: null,
  ...overrides
});

const resetState = async (overrides = {}) => {
  state = {
    user: makeUser(),
    code: {
      id: 9,
      code_hash: makeCodeHash('123456'),
      attempts: 0,
      used_at: null,
      is_expired: false
    },
    commits: 0,
    rollbacks: 0,
    smsConfigured: false,
    ...overrides
  };
  state.user = { ...makeUser(), ...state.user };
  if (state.user.password === '') {
    state.user.password = await bcrypt.hash('CorrectHorse!42', 4);
  }
  return state;
};

test('valid email OTP verifies both fields atomically and returns a customer session', async () => {
  await resetState();
  const res = makeResponse();

  await verifyCustomerContacts({
    body: { email: 'CUSTOMER@example.com', channel: 'email', code: '123456' }
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(state.user.verification_status, 'verified');
  assert.equal(state.user.email_verified_at, verificationDate);
  assert.equal(state.code.used_at, verificationDate);
  assert.equal(state.commits, 1);
  assert.equal(res.body.user.email, 'customer@example.com');
  assert.equal(jwt.verify(res.body.token, process.env.JWT_SECRET).role, 'customer');
});

test('email OTP uses a random six-digit value and stores only a hash with ten-minute expiry', async () => {
  await resetState({ code: null });
  const delivery = await startCustomerVerification(state.user, 'email');

  assert.equal(delivery.email_sent, true);
  assert.match(state.sentCode, /^\d{6}$/);
  assert.equal(state.code.code_hash.length, 64);
  assert.equal(state.code.code_hash, makeCodeHash(state.sentCode));
  assert.match(state.insertSql, /DATE_ADD\(NOW\(\), INTERVAL 10 MINUTE\)/);
});

test('customer verification sends an SMS OTP and verifies the phone without exposing the code', async () => {
  await resetState({ code: null, smsConfigured: true });
  const delivery = await startCustomerVerification(state.user);

  assert.equal(delivery.sms_sent, true);
  assert.equal(delivery.channel, 'sms');
  assert.equal(state.sentChannel, 'sms');
  assert.equal(state.sentPhone, state.user.phone);
  assert.match(state.sentCode, /^\d{6}$/);
  assert.equal(state.code.channel, 'sms');
  assert.equal(state.code.code_hash, makeCodeHash(state.sentCode));
  assert.match(state.insertSql, /DATE_ADD\(NOW\(\), INTERVAL 10 MINUTE\)/);

  const res = makeResponse();
  await verifyCustomerContacts({
    body: { email: 'customer@example.com', channel: 'sms', code: state.sentCode }
  }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(state.user.phone_verified_at, verificationDate);
  assert.equal(state.user.email_verified_at, null);
  assert.equal(state.user.verification_status, 'verified');
  assert.equal(res.body.user.email, state.user.email);
});

test('customer registration sends email verification and stages details before creating an account', async () => {
  await resetState({ code: null, smsConfigured: false });
  const res = makeResponse();

  await registerCustomer({
    body: {
      name: 'New Customer',
      email: 'new.customer@example.com',
      password: 'StrongPassword!42',
      phone: '0788123456',
    }
  }, res);

  assert.equal(res.statusCode, 202);
  assert.equal(res.body.verification_required, true);
  assert.equal(res.body.email_sent, true);
  assert.equal(res.body.email_mode, 'smtp');
  assert.equal(res.body.sms_sent, undefined);
  assert.equal(res.body.phone, '+250788123456');
  assert.equal(state.stagedRegistration.phone, '+250788123456');
  assert.equal(state.stagedRegistration.email, 'new.customer@example.com');
  assert.equal(state.user.email, 'customer@example.com');
});

test('customer SMS verification does not fall back to email when delivery fails', async () => {
  await resetState({
    code: null,
    smsConfigured: true,
    smsError: Object.assign(new Error('provider failure'), { code: 'SMS_UNAVAILABLE' })
  });
  const delivery = await startCustomerVerification(state.user);

  assert.equal(delivery.sms_sent, false);
  assert.equal(delivery.email_sent, false);
  assert.equal(delivery.channel, 'sms');
  assert.equal(state.sentChannel, 'sms');
  assert.equal(state.code.channel, 'sms');
  assert.ok(state.code.used_at);
  assert.equal(delivery.sms_error, 'SMS could not be delivered right now. Please try again later.');
});

test('registration verification is not changed by a requested SMS channel', async () => {
  await resetState({ code: null, smsConfigured: true });
  const response = makeResponse();

  await registerCustomer({
    body: {
      name: 'New Customer',
      email: 'new.customer@example.com',
      password: 'StrongPassword!42',
      phone: '0788123456',
      channel: 'sms'
    }
  }, response);

  assert.equal(response.statusCode, 202);
  assert.equal(response.body.email_sent, true);
  assert.equal(response.body.sms_sent, undefined);
  assert.equal(state.stagedRegistration.phone, '+250788123456');
});

test('repeating the successful OTP request returns a session instead of an already-verified error', async () => {
  await resetState();
  const firstResponse = makeResponse();
  await verifyCustomerContacts({
    body: { email: 'customer@example.com', channel: 'email', code: '123456' }
  }, firstResponse);

  const repeatedResponse = makeResponse();
  await verifyCustomerContacts({
    body: { email: 'customer@example.com', channel: 'email', code: '123456' }
  }, repeatedResponse);

  assert.equal(firstResponse.statusCode, 200);
  assert.equal(repeatedResponse.statusCode, 200);
  assert.equal(repeatedResponse.body.user.id, state.user.id);
  assert.equal(jwt.verify(repeatedResponse.body.token, process.env.JWT_SECRET).id, state.user.id);
});

test('expired codes and invalid codes return clear errors and invalid attempts are counted', async () => {
  await resetState({ code: { id: 9, code_hash: makeCodeHash('123456'), attempts: 0, used_at: null, is_expired: true } });
  const expiredResponse = makeResponse();
  await verifyCustomerContacts({
    body: { email: 'customer@example.com', channel: 'email', code: '123456' }
  }, expiredResponse);
  assert.match(expiredResponse.body.message, /expired/i);

  await resetState();
  const invalidResponse = makeResponse();
  await verifyCustomerContacts({
    body: { email: 'customer@example.com', channel: 'email', code: '654321' }
  }, invalidResponse);
  assert.equal(invalidResponse.statusCode, 400);
  assert.match(invalidResponse.body.message, /invalid/i);
  assert.equal(state.code.attempts, 1);
});

test('SMS verification codes expire and stop accepting attempts after five failures', async () => {
  await resetState({
    code: {
      id: 9,
      code_hash: makeCodeHash('123456'),
      channel: 'sms',
      attempts: 0,
      used_at: null,
      is_expired: true
    }
  });
  const expired = makeResponse();
  await verifyCustomerContacts({
    body: { email: 'customer@example.com', channel: 'sms', code: '123456' }
  }, expired);
  assert.match(expired.body.message, /expired/i);

  await resetState({
    code: {
      id: 9,
      code_hash: makeCodeHash('123456'),
      channel: 'sms',
      attempts: 0,
      used_at: null,
      is_expired: false
    }
  });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = makeResponse();
    await verifyCustomerContacts({
      body: { email: 'customer@example.com', channel: 'sms', code: '654321' }
    }, response);
  }
  const limited = makeResponse();
  await verifyCustomerContacts({
    body: { email: 'customer@example.com', channel: 'sms', code: '123456' }
  }, limited);
  assert.equal(state.code.attempts, 5);
  assert.match(limited.body.message, /maximum code attempts/i);
});

test('verification stops after five incorrect OTP attempts', async () => {
  await resetState();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const res = makeResponse();
    await verifyCustomerContacts({
      body: { email: 'customer@example.com', channel: 'email', code: '654321' }
    }, res);
    assert.equal(res.statusCode, 400);
  }

  const limitedResponse = makeResponse();
  await verifyCustomerContacts({
    body: { email: 'customer@example.com', channel: 'email', code: '123456' }
  }, limitedResponse);

  assert.equal(state.code.attempts, 5);
  assert.match(limitedResponse.body.message, /maximum code attempts/i);
  assert.equal(limitedResponse.body.token, undefined);
});

test('customer login succeeds for an already-verified account', async () => {
  await resetState({
    user: makeUser({
      verification_status: 'verified',
      email_verified_at: verificationDate
    })
  });
  const res = makeResponse();

  await loginCustomer({
    body: { email: 'customer@example.com', password: 'CorrectHorse!42' }
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(jwt.verify(res.body.token, process.env.JWT_SECRET).role, 'customer');
  assert.equal(res.body.user.id, state.user.id);
});

test('customer login remains unchanged for phone-verified accounts', async () => {
  await resetState({
    user: makeUser({
      verification_status: 'verified',
      email_verified_at: null,
      phone_verified_at: verificationDate
    })
  });

  const res = makeResponse();
  await loginCustomer({
    body: { email: 'customer@example.com', password: 'CorrectHorse!42' }
  }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(jwt.verify(res.body.token, process.env.JWT_SECRET).role, 'customer');
});

test('customer portal access accepts phone verification when status is pending', async () => {
  await resetState({
    user: makeUser({
      verification_status: 'pending',
      email_verified_at: null,
      phone_verified_at: verificationDate
    })
  });
  const res = makeResponse();
  let nextCalled = false;
  const token = jwt.sign(
    { id: state.user.id, email: state.user.email, role: 'customer' },
    process.env.JWT_SECRET
  );

  await authMiddleware({
    header: () => `Bearer ${token}`
  }, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});

test('customer registration returns service unavailable when database connection is refused', async () => {
  await resetState({
    registrationError: Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' })
  });
  const res = makeResponse();

  await registerCustomer({
    body: {
      name: 'New Customer',
      email: 'new.customer@example.com',
      password: 'CorrectHorse!42',
      phone: '+250788123456'
    }
  }, res);

  assert.equal(res.statusCode, 503);
  assert.match(res.body.message, /temporarily unavailable/i);
});

test('customer login repairs a pending status when the email is already verified', async () => {
  await resetState({
    user: makeUser({ email_verified_at: verificationDate })
  });
  const res = makeResponse();

  await loginCustomer({
    body: { email: 'customer@example.com', password: 'CorrectHorse!42' }
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(state.user.verification_status, 'verified');
  assert.equal(jwt.verify(res.body.token, process.env.JWT_SECRET).id, state.user.id);
});

test('customer status cannot bypass verification when no verified email timestamp exists', async () => {
  await resetState({
    user: makeUser({ verification_status: 'verified' }),
    code: null
  });
  const res = makeResponse();

  await loginCustomer({
    body: { email: 'customer@example.com', password: 'CorrectHorse!42' }
  }, res);

  assert.equal(res.statusCode, 202);
  assert.equal(res.body.verification_required, true);
  assert.equal(res.body.email_sent, true);
  assert.equal(res.body.token, undefined);
});
