const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const test = require('node:test');
const bcrypt = require('bcryptjs');

process.env.JWT_SECRET = 'password-recovery-test-secret';

const expectedGenericRequestMessage = 'If an account exists for this email, a reset code will be sent to its phone or email. If it does not arrive, try again later.';
let state;
const makeCodeHash = (code) => crypto
  .createHmac('sha256', process.env.JWT_SECRET)
  .update(code)
  .digest('hex');

const db = {
  async query(sql, params) {
    if (state.databaseError) throw state.databaseError;
    if (sql.includes('UPDATE password_reset_codes SET used_at = NOW() WHERE id = ?')) {
      const current = state.codes.find((code) => code.id === params[0]);
      if (current) current.used_at = new Date();
      return [{ affectedRows: current ? 1 : 0 }];
    }
    if (sql.includes('SELECT id, email, phone, email_verified_at, phone_verified_at FROM users WHERE email = ? AND role = ?')) {
      const user = state.user;
      return [[user && user.email === params[0] && user.role === params[1] && user.status === 'active'
        ? {
          id: user.id,
          email: user.email,
          phone: user.phone,
          email_verified_at: user.email_verified_at,
          phone_verified_at: user.phone_verified_at
        }
        : undefined].filter(Boolean)];
    }
    if (sql.includes('SELECT * FROM users WHERE email = ? AND role = ?')) {
      const user = state.user;
      return [[user && user.email === params[0] && user.role === params[1]
        ? { ...user }
        : undefined].filter(Boolean)];
    }
    if (sql.includes('SELECT id, email FROM admins WHERE email = ?')) {
      return [[state.admin && state.admin.email === params[0]
        ? { id: state.admin.id, email: state.admin.email }
        : undefined].filter(Boolean)];
    }
    if (sql.includes('SELECT COUNT(*) AS count FROM password_reset_codes')) {
      const column = sql.includes('admin_id') ? 'admin_id' : 'user_id';
      return [[{ count: state.codes.filter((code) => (
        code.createdRecently
        && code[column] === params[0]
        && (!code.account_role || code.account_role === params[1])
      )).length }]];
    }
    if (sql.includes('UPDATE password_reset_codes SET used_at = NOW()')) {
      const column = sql.includes('admin_id') ? 'admin_id' : 'user_id';
      for (const code of state.codes) {
        if (
          code[column] === params[0]
          && (!code.account_role || code.account_role === params[1])
          && !code.used_at
        ) code.used_at = new Date();
      }
      return [{ affectedRows: 1 }];
    }
    throw new Error(`Unexpected database query: ${sql}`);
  },
  async getConnection() {
    if (state.connectionError) throw state.connectionError;
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
        if (sql.includes('UPDATE password_reset_codes SET used_at = NOW() WHERE id = ?')) {
          const current = state.codes.find((code) => code.id === params[0]);
          if (current) current.used_at = new Date();
          return [{ affectedRows: current ? 1 : 0 }];
        }
        if (sql.includes('SELECT id, email, phone, email_verified_at, phone_verified_at FROM users WHERE email = ?')) {
          const user = state.user;
          return [[user && user.email === params[0] && user.role === params[1] && user.status === 'active'
            ? {
              id: user.id,
              email: user.email,
              phone: user.phone,
              email_verified_at: user.email_verified_at,
              phone_verified_at: user.phone_verified_at
            }
            : undefined].filter(Boolean)];
        }
        if (sql.includes('SELECT id, email FROM admins WHERE email = ?')) {
          return [[state.admin && state.admin.email === params[0]
            ? { id: state.admin.id, email: state.admin.email }
            : undefined].filter(Boolean)];
        }
        if (sql.includes('FROM password_reset_codes')) {
          const column = sql.includes('admin_id') ? 'admin_id' : 'user_id';
          const current = state.codes
            .filter((code) => code[column] === params[0] && code.account_role === params[1] && code.channel === params[2])
            .sort((a, b) => b.id - a.id)[0];
          return [[current ? {
            ...current,
            is_expired: current.is_expired ? 1 : 0
          } : undefined].filter(Boolean)];
        }
        if (sql.includes('UPDATE password_reset_codes SET used_at = NOW() WHERE')) {
          const current = state.codes.find((code) => code.id === params[0]);
          if (current) current.used_at = new Date();
          return [{ affectedRows: current ? 1 : 0 }];
        }
        if (sql.includes('UPDATE password_reset_codes SET attempts = ?, used_at = ?')) {
          const current = state.codes.find((code) => code.id === params[2]);
          current.attempts = params[0];
          current.used_at = params[1];
          return [{ affectedRows: 1 }];
        }
        if (sql.includes('UPDATE admins SET password = ?')) {
          state.admin.password = params[0];
          return [{ affectedRows: 1 }];
        }
        if (sql.includes('UPDATE users SET password = ?')) {
          state.user.password = params[0];
          return [{ affectedRows: 1 }];
        }
        if (sql.includes('UPDATE password_reset_codes SET used_at = NOW()')) {
          const column = sql.includes('admin_id') ? 'admin_id' : 'user_id';
          for (const code of state.codes) {
            if (code[column] === params[0] && !code.used_at) code.used_at = new Date();
          }
          return [{ affectedRows: 1 }];
        }
        if (sql.includes('INSERT INTO password_reset_codes')) {
          const accountColumn = sql.includes('admin_id') ? 'admin_id' : 'user_id';
          const record = {
            id: state.nextCodeId++,
            [accountColumn]: params[0],
            account_role: params[1],
            code_hash: params[2],
            channel: params[3],
            attempts: 0,
            used_at: null,
            is_expired: false,
            createdRecently: true
          };
          state.codes.push(record);
          state.latestCode = record;
          return [{ insertId: record.id }];
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
  sendPasswordResetOTP: async (email, code) => {
    const subject = 'Your Lux Energy password reset code';
    const text = `Use this Lux Energy code to reset your password: ${code}. It expires in 10 minutes. Do not share this code with anyone.`;
    if (state.emailError) throw state.emailError;
    state.delivered.push({ email, subject, text });
    state.lastSentCode = code;
    state.sentChannel = 'email';
    return true;
  },
  normalizeSmsPhone: (phone) => phone,
  smsConfigured: () => Boolean(state.smsConfigured),
  sendSmsOTP: async (phone, code, purpose) => {
    if (state.smsError) throw state.smsError;
    state.delivered.push({ phone, purpose, text: `Reset code ${code}` });
    state.lastSentCode = code;
    state.sentChannel = 'sms';
    return true;
  }
});
installMock('../src/middleware/validation.js', {
  passwordMeetsPolicy: (password) => typeof password === 'string'
    && password.length >= 12
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password)
});

const { requestPasswordReset, resetPassword } = require('../src/controllers/passwordRecoveryController');
const { loginAgent } = require('../src/controllers/authController');

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

const resetState = (role = 'customer', options = {}) => {
  state = {
    user: {
      id: 42,
      email: 'user@example.com',
      phone: '+250788123456',
      role,
      status: 'active',
      email_verified_at: new Date(),
      phone_verified_at: null,
      password: 'old-hash'
    },
    admin: {
      id: 7,
      email: 'admin@example.com',
      password: 'old-admin-hash'
    },
    codes: [],
    delivered: [],
    latestCode: null,
    nextCodeId: 1,
    commits: 0,
    rollbacks: 0,
    smsConfigured: false,
    ...options
  };
  return state;
};

const requestCode = async (
  email = 'user@example.com',
  role = 'customer',
  channel,
  phone = '+250788123456'
) => {
  const res = makeResponse();
  await requestPasswordReset({
    body: { email, role, channel: channel || 'email', phone }
  }, res);
  if (state.latestCode && state.lastSentCode) state.latestCode.plainCode = state.lastSentCode;
  return res;
};

const submitReset = async ({
  email = 'user@example.com',
  role = 'customer',
  code = state.latestCode?.plainCode || '123456',
  channel = state.latestCode?.channel || 'email',
  password = 'SecurePassword!42',
  confirmPassword = password
} = {}) => {
  const res = makeResponse();
  await resetPassword({ body: { email, role, channel, code, password, confirmPassword } }, res);
  return res;
};

test('existing customer receives an email code and can reset their password', async () => {
  resetState('customer');
  const request = await requestCode();
  const reset = await submitReset();

  assert.equal(request.statusCode, 200);
  assert.equal(request.body.message, expectedGenericRequestMessage);
  assert.equal(state.delivered.length, 1);
  assert.equal(state.delivered[0].email, 'user@example.com');
  assert.match(state.delivered[0].text, /expires in 10 minutes/i);
  assert.match(state.delivered[0].text, /\d{6}/);
  assert.equal(state.latestCode.account_role, 'customer');
  assert.equal(state.latestCode.code_hash, makeCodeHash(state.latestCode.plainCode));
  assert.equal(reset.statusCode, 200);
  assert.equal(await bcrypt.compare('SecurePassword!42', state.user.password), true);
  assert.ok(state.latestCode.used_at);
  assert.equal(reset.body.token, undefined);
});

test('existing customer receives an SMS code and can reset their password', async () => {
  resetState('customer', { smsConfigured: true });
  const request = await requestCode('user@example.com', 'customer', 'sms');
  const reset = await submitReset({ channel: 'sms' });

  assert.equal(request.statusCode, 200);
  assert.equal(state.delivered.length, 1);
  assert.equal(state.delivered[0].phone, '+250788123456');
  assert.equal(state.sentChannel, 'sms');
  assert.equal(state.latestCode.channel, 'sms');
  assert.equal(state.latestCode.code_hash, makeCodeHash(state.latestCode.plainCode));
  assert.equal(reset.statusCode, 200);
  assert.equal(await bcrypt.compare('SecurePassword!42', state.user.password), true);
});

test('customer can choose email recovery even when SMS is configured', async () => {
  resetState('customer', { smsConfigured: true });
  const request = await requestCode('user@example.com', 'customer', 'email');
  const reset = await submitReset();

  assert.equal(request.body.message, expectedGenericRequestMessage);
  assert.equal(state.delivered.length, 1);
  assert.equal(state.sentChannel, 'email');
  assert.equal(state.latestCode.channel, 'email');
  assert.equal(state.delivered[0].email, 'user@example.com');
  assert.equal(reset.statusCode, 200);
});

test('SMS recovery only sends to the phone registered on the account', async () => {
  resetState('customer', { smsConfigured: true });
  const request = await requestCode('user@example.com', 'customer', 'sms', '+250788000000');

  assert.equal(request.body.message, expectedGenericRequestMessage);
  assert.equal(state.sentChannel, undefined);
  assert.equal(state.latestCode, null);
  assert.equal(state.delivered.length, 0);
  assert.equal(state.delivered.some((delivery) => delivery.phone), false);
});

test('phone-verified customer can request SMS password recovery without email verification', async () => {
  resetState('customer', {
    smsConfigured: true,
    user: {
      id: 42,
      email: 'user@example.com',
      phone: '+250788123456',
      role: 'customer',
      status: 'active',
      email_verified_at: null,
      phone_verified_at: new Date()
    }
  });
  const request = await requestCode('user@example.com', 'customer', 'sms');
  const reset = await submitReset({ channel: 'sms' });

  assert.equal(request.body.message, expectedGenericRequestMessage);
  assert.equal(state.sentChannel, 'sms');
  assert.equal(state.latestCode.channel, 'sms');
  assert.equal(reset.statusCode, 200);
  assert.equal(await bcrypt.compare('SecurePassword!42', state.user.password), true);
});

test('a selected SMS recovery request does not accept an email-channel reset', async () => {
  resetState('customer', { smsConfigured: true });
  await requestCode('user@example.com', 'customer', 'sms');
  const result = await submitReset({ channel: 'email' });

  assert.equal(result.statusCode, 400);
  assert.equal(state.user.password, 'old-hash');
  assert.equal(state.latestCode.used_at, null);
});

test('customers must explicitly select a recovery channel', async () => {
  resetState('customer', { smsConfigured: true });
  const result = makeResponse();
  await requestPasswordReset({ body: { email: 'user@example.com', role: 'customer' } }, result);

  assert.equal(result.statusCode, 400);
  assert.equal(state.delivered.length, 0);
  assert.equal(state.codes.length, 0);
});

test('password recovery does not send email automatically when selected SMS delivery fails', async () => {
  resetState('customer', {
    smsConfigured: true,
    smsError: Object.assign(new Error('provider failure'), { code: 'SMS_UNAVAILABLE' })
  });
  const response = await requestCode('user@example.com', 'customer', 'sms');

  assert.equal(response.body.message, expectedGenericRequestMessage);
  assert.equal(state.codes.length, 1);
  assert.equal(state.codes[0].channel, 'sms');
  assert.ok(state.codes[0].used_at);
  assert.equal(state.sentChannel, undefined);

  await requestCode('user@example.com', 'customer', 'email');
  const reset = await submitReset();
  assert.equal(state.latestCode.channel, 'email');
  assert.equal(state.sentChannel, 'email');
  assert.equal(reset.statusCode, 200);
});

test('existing agent reset is scoped to the agent account type', async () => {
  resetState('agent');
  await requestCode('user@example.com', 'agent');
  const result = await submitReset({ role: 'agent' });

  assert.equal(result.statusCode, 200);
  assert.equal(state.latestCode.account_role, 'agent');
  assert.equal(await bcrypt.compare('SecurePassword!42', state.user.password), true);
});

test('unknown email receives the same generic request response without sending email', async () => {
  resetState();
  const result = await requestCode('unknown@example.com');

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.message, expectedGenericRequestMessage);
  assert.equal(state.delivered.length, 0);
});

test('database connection failures return an unavailable response instead of a success-shaped response', async () => {
  resetState('customer', {
    databaseError: Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' })
  });
  const result = await requestCode();

  assert.equal(result.statusCode, 503);
  assert.match(result.body.message, /temporarily unavailable/i);
  assert.notEqual(result.body.message, expectedGenericRequestMessage);
});

test('database failures while creating a reset code also return unavailable', async () => {
  resetState('customer', {
    connectionError: Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' })
  });
  const result = await requestCode('user@example.com', 'customer', 'email');

  assert.equal(result.statusCode, 503);
  assert.match(result.body.message, /temporarily unavailable/i);
});

test('unverified customers cannot request password-reset emails', async () => {
  resetState('customer', { user: {
    id: 42,
    email: 'user@example.com',
    role: 'customer',
    status: 'active',
    email_verified_at: null,
    password: 'old-hash'
  } });
  const result = await requestCode();

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.message, expectedGenericRequestMessage);
  assert.equal(state.delivered.length, 0);
  assert.equal(state.codes.length, 0);
});

test('a customer who becomes unverified cannot use a previously issued reset code', async () => {
  resetState('customer');
  await requestCode();
  state.user.email_verified_at = null;

  const result = await submitReset();

  assert.equal(result.statusCode, 400);
  assert.equal(result.body.message, 'The reset code is invalid.');
  assert.equal(state.user.password, 'old-hash');
  assert.equal(state.latestCode.used_at, null);
});

test('SMTP delivery failure invalidates the reset code and preserves the generic safe response', async () => {
  resetState('customer', {
    emailError: Object.assign(new Error('sensitive provider detail'), { code: 'EMAIL_DELIVERY_FAILED' })
  });
  const response = makeResponse();

  await requestPasswordReset({
    body: { email: 'user@example.com', role: 'customer', channel: 'email' }
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.message, expectedGenericRequestMessage);
  assert.doesNotMatch(response.body.message, /sensitive provider detail/i);
  assert.equal(state.latestCode.used_at instanceof Date, true);
});

test('expired and incorrect codes return clear errors without changing the password', async () => {
  resetState();
  await requestCode();
  state.latestCode.is_expired = true;
  const expired = await submitReset();
  assert.match(expired.body.message, /expired/i);
  assert.equal(state.user.password, 'old-hash');

  resetState();
  await requestCode();
  const incorrect = await submitReset({ code: '654321' });
  assert.equal(incorrect.statusCode, 400);
  assert.match(incorrect.body.message, /invalid/i);
  assert.equal(state.latestCode.attempts, 1);
  assert.equal(state.user.password, 'old-hash');
});

test('a reused reset code cannot be used again', async () => {
  resetState();
  await requestCode();
  const first = await submitReset();
  const second = await submitReset();

  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 400);
  assert.match(second.body.message, /already been used/i);
});

test('a new request invalidates the previous code and requests are capped per account', async () => {
  resetState();
  await requestCode();
  const first = state.latestCode;
  await requestCode();
  const second = state.latestCode;

  assert.ok(first.used_at);
  assert.notEqual(first.id, second.id);
  assert.equal(state.delivered.length, 2);

  state.codes.push({ id: 3, user_id: 42, createdRecently: true, used_at: null });
  await requestCode();
  assert.equal(state.delivered.length, 2);
  assert.equal(state.codes.filter((code) => code.createdRecently).length, 3);
});

test('wrong account type cannot use another role’s reset code', async () => {
  resetState('customer');
  await requestCode('user@example.com', 'customer');
  const result = await submitReset({ role: 'agent' });

  assert.equal(result.statusCode, 400);
  assert.equal(result.body.message, 'The reset code is invalid.');
  assert.equal(state.user.password, 'old-hash');
});

test('weak password is rejected without consuming the code', async () => {
  resetState();
  await requestCode();
  const result = await submitReset({ password: 'weak', confirmPassword: 'weak' });

  assert.equal(result.statusCode, 400);
  assert.match(result.body.message, /at least 12 characters/i);
  assert.equal(state.latestCode.used_at, null);
});

test('password confirmation must match before a reset code is consumed', async () => {
  resetState();
  await requestCode();
  const result = await submitReset({
    password: 'SecurePassword!42',
    confirmPassword: 'DifferentPassword!42'
  });

  assert.equal(result.statusCode, 400);
  assert.match(result.body.message, /passwords do not match/i);
  assert.equal(state.latestCode.used_at, null);
});

test('five wrong reset codes trigger a rate-limit response', async () => {
  resetState('customer', { smsConfigured: true });
  await requestCode('user@example.com', 'customer', 'sms');
  assert.equal(state.latestCode.channel, 'sms');
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await submitReset({ code: '654321' });
    if (attempt < 4) assert.equal(result.statusCode, 400);
    else assert.equal(result.statusCode, 429);
  }
  assert.equal(state.latestCode.attempts, 5);
  assert.equal(state.user.password, 'old-hash');
});

test('successful reset password can be used as the new login credential', async () => {
  resetState('agent');
  await requestCode('user@example.com', 'agent');
  const result = await submitReset({ role: 'agent' });
  const login = makeResponse();
  await loginAgent({
    body: { email: 'user@example.com', password: 'SecurePassword!42' }
  }, login);

  assert.equal(result.statusCode, 200);
  assert.equal(await bcrypt.compare('SecurePassword!42', state.user.password), true);
  assert.equal(await bcrypt.compare('OldPassword!42', state.user.password), false);
  assert.equal(result.body.token, undefined);
  assert.equal(login.statusCode, 200);
  assert.equal(login.body.user.role, 'agent');
  assert.ok(login.body.token);
});
