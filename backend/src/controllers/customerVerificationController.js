const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const {
  emailConfigured,
  emailMode,
  normalizeSmsPhone,
  sendEmailOTP,
  sendSmsOTP,
  smsConfigured
} = require('../services/notificationService');

const codeHash = (code) => crypto.createHmac('sha256', process.env.JWT_SECRET).update(code).digest('hex');
const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  station_id: user.station_id || null
});

const createAndSendCode = async (user, channel) => {
  const [recentCodes] = await db.query(
    `SELECT COUNT(*) AS count FROM customer_verification_codes
     WHERE user_id = ? AND channel = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 2 MINUTE)`,
    [user.id, channel]
  );
  if (Number(recentCodes[0].count) >= 3) {
    throw Object.assign(new Error(`Too many ${channel === 'sms' ? 'SMS' : 'email'} codes requested. Try again in 2 minutes.`), {
      status: 429,
      retryAfterSeconds: 120
    });
  }

  const recipient = channel === 'sms' ? normalizeSmsPhone(user.phone) : user.email;
  if (!recipient || (channel === 'sms' ? !smsConfigured() : !emailConfigured())) {
    throw Object.assign(new Error(`${channel === 'sms' ? 'SMS' : 'Email'} delivery is not configured or the contact is invalid.`), {
      status: 503
    });
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const connection = await db.getConnection();
  let codeId;
  try {
    await connection.beginTransaction();
    await connection.query(
      `UPDATE customer_verification_codes SET used_at = NOW()
       WHERE user_id = ? AND channel = ? AND used_at IS NULL`,
      [user.id, channel]
    );
    const [inserted] = await connection.query(
      `INSERT INTO customer_verification_codes (user_id, code_hash, channel, expires_at)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
      [user.id, codeHash(code), channel]
    );
    codeId = inserted.insertId;
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  try {
    const sent = channel === 'sms'
      ? await sendSmsOTP(recipient, code)
      : await sendEmailOTP(recipient, code);
    if (!sent) {
      throw Object.assign(new Error(`${channel === 'sms' ? 'SMS' : 'Email'} verification delivery is not configured.`), { status: 503 });
    }
  } catch (error) {
    await db.query('UPDATE customer_verification_codes SET used_at = NOW() WHERE id = ?', [codeId]);
    console.error(`${channel === 'sms' ? 'SMS' : 'Email'} verification delivery failed:`, error.code || 'UNKNOWN_ERROR');
    if (error.status) throw error;
    throw Object.assign(new Error(`${channel === 'sms' ? 'SMS' : 'Email'} could not be delivered right now. Please try again later.`), {
      status: 503
    });
  }
};

const startCustomerVerification = async (user, preferredChannel = 'sms') => {
  const delivery = {
    email: user.email,
    phone: user.phone,
    channel: preferredChannel,
    email_sent: false,
    sms_sent: false,
    email_mode: emailMode(),
    email_error: '',
    email_verified: false,
    phone_verified: false,
    retry_after_seconds: 0
  };
  const [verification] = await db.query(
    'SELECT email_verified_at, phone_verified_at FROM users WHERE id = ?', [user.id]
  );
  delivery.email_verified = Boolean(verification[0]?.email_verified_at);
  delivery.phone_verified = Boolean(verification[0]?.phone_verified_at);

  const targetChannel = preferredChannel === 'sms' ? 'sms' : 'email';
  if ((targetChannel === 'email' && delivery.email_verified)
    || (targetChannel === 'sms' && delivery.phone_verified)) {
    delivery.message = `Your ${targetChannel === 'sms' ? 'phone number' : 'email address'} is already verified.`;
    return delivery;
  }

  try {
    await createAndSendCode(user, targetChannel);
    delivery.channel = targetChannel;
    delivery.sms_sent = targetChannel === 'sms';
    delivery.email_sent = targetChannel === 'email';
    delivery.message = targetChannel === 'sms' ? 'SMS verification code sent.' : 'Email verification code sent.';
  } catch (error) {
    if (error.status === 429) {
      if (targetChannel === 'sms') delivery.sms_error = error.message;
      else delivery.email_error = error.message;
      delivery.retry_after_seconds = error.retryAfterSeconds || 120;
      delivery.message = error.message;
      return delivery;
    }
    if (targetChannel === 'sms') delivery.sms_error = error.message;
    else delivery.email_error = error.message;
    delivery.message = `${targetChannel === 'sms' ? 'SMS' : 'Email'} could not be sent. Choose another method or try again later.`;
  }
  return delivery;
};

const sendCustomerSession = (res, user) => {
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, stationId: user.station_id || null },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  return res.json({ token, user: publicUser(user) });
};

const verifyCustomerContacts = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const channel = req.body.channel || 'email';
  const suppliedCode = String(req.body.code || '').trim();
  if (!email || !['email', 'sms'].includes(channel) || !/^\d{6}$/.test(suppliedCode)) {
    return res.status(400).json({ message: 'Enter a valid six-digit verification code.' });
  }
  const verifiedColumn = channel === 'sms' ? 'phone_verified_at' : 'email_verified_at';
  const channelLabel = channel === 'sms' ? 'phone' : 'email';

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [users] = await connection.query(
      `SELECT id, name, email, phone, role, station_id, status, verification_status,
              email_verified_at, phone_verified_at
       FROM users WHERE email = ? AND role = 'customer' LIMIT 1 FOR UPDATE`,
      [email]
    );
    const user = users[0];
    if (!user || user.status !== 'active') {
      await connection.rollback();
      return res.status(400).json({ message: 'The account or verification code is invalid.' });
    }
    const [codes] = await connection.query(
      `SELECT id, code_hash, attempts, used_at,
              (expires_at <= NOW()) AS is_expired,
              (used_at = ?) AS used_for_verification
       FROM customer_verification_codes
       WHERE user_id = ? AND channel = ?
       ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [user[verifiedColumn], user.id, channel]
    );
    const current = codes[0];
    if (!current) {
      await connection.rollback();
      return res.status(400).json({ message: `No ${channelLabel} verification code was found. Request a new code.` });
    }
    if (Number(current.is_expired) === 1) {
      await connection.rollback();
      return res.status(400).json({ message: `This ${channelLabel} verification code has expired. Request a new code.` });
    }
    if (current.attempts >= 5) {
      await connection.rollback();
      return res.status(400).json({ message: `Maximum code attempts reached. Request a new ${channelLabel} code.` });
    }
    const expected = Buffer.from(current.code_hash, 'hex');
    const supplied = Buffer.from(codeHash(suppliedCode), 'hex');
    const matches = expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
    if (current.used_at) {
      await connection.rollback();
      if (matches && Number(current.used_for_verification) === 1) {
        return sendCustomerSession(res, user);
      }
      return res.status(400).json({ message: `This ${channelLabel} verification code has already been used. Request a new code or sign in.` });
    }
    if (!matches) {
      const attempts = current.attempts + 1;
      await connection.query(
        'UPDATE customer_verification_codes SET attempts = ? WHERE id = ?',
        [attempts, current.id]
      );
      await connection.commit();
      return res.status(400).json({
        message: attempts >= 5
          ? `Maximum code attempts reached. Request a new ${channelLabel} code.`
          : `The ${channelLabel} verification code is invalid.`
      });
    }

    await connection.query(
      `UPDATE users
       SET ${verifiedColumn} = COALESCE(${verifiedColumn}, NOW()), verification_status = 'verified'
       WHERE id = ?`,
      [user.id]
    );
    await connection.query(
      `UPDATE customer_verification_codes
       SET used_at = (SELECT ${verifiedColumn} FROM users WHERE id = ?)
       WHERE id = ?`,
      [user.id, current.id]
    );
    await connection.commit();
    user.verification_status = 'verified';
    user[verifiedColumn] = user[verifiedColumn] || new Date();
    return sendCustomerSession(res, user);
  } catch (error) {
    await connection.rollback();
    console.error('Customer verification failed:', error.code || error.message);
    res.status(500).json({ message: 'Unable to verify your account right now.' });
  } finally {
    connection.release();
  }
};

const resendCustomerVerification = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const requestedChannel = req.body.channel || 'email';
  if (!['email', 'sms'].includes(requestedChannel)) {
    return res.status(400).json({ message: 'Choose email or SMS verification.' });
  }
  if (!email) return res.status(400).json({ message: 'Enter your account email.' });
  try {
    const [users] = await db.query(
      `SELECT id, name, email, phone, email_verified_at, phone_verified_at FROM users
       WHERE email = ? AND role = 'customer' AND status = 'active' AND verification_status = 'pending'
       LIMIT 1`,
      [email]
    );
    if (users.length) {
      const delivery = await startCustomerVerification(users[0], requestedChannel);
      if (delivery.retry_after_seconds) {
        return res.status(429).json({
          message: delivery.message,
          retry_after_seconds: delivery.retry_after_seconds
        });
      }
      return res.json(delivery);
    }
    res.json({
      email_sent: false,
      sms_sent: false,
      message: 'If this account needs verification, a code will be sent when delivery is configured.'
    });
  } catch (error) {
    if (error.status === 429) return res.status(429).json({ message: error.message });
    console.error('Resend customer verification failed:', error.code || error.message);
    res.status(error.status || 503).json({ message: 'Unable to send verification codes right now.' });
  }
};

module.exports = { startCustomerVerification, verifyCustomerContacts, resendCustomerVerification };
