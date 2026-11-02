const crypto = require('crypto');
const db = require('../config/database');
const {
  emailConfigured,
  emailMode,
  sendEmailOTP
} = require('../services/notificationService');

const registrationRequestMessage = 'If this email and phone can be used for registration, a verification code will be sent to your email.';
const registrationCompleteMessage = 'If this email and phone can be used for an account, email verification is complete. Sign in or use password recovery to continue.';
const invalidChallengeMessage = 'The verification request is invalid or expired. Request a new code.';
const codeHash = (code) => crypto.createHmac('sha256', process.env.JWT_SECRET).update(code).digest('hex');

const deliverRegistrationCode = async (email, code) => {
  try {
    const sent = await sendEmailOTP(email, code);
    if (!sent) throw Object.assign(new Error('Email delivery is not configured.'), { code: 'EMAIL_NOT_CONFIGURED' });
    console.info('Customer registration email verification status: accepted');
    return true;
  } catch (error) {
    console.error('Customer registration email verification status: failed', error.code || 'UNKNOWN_ERROR');
    return false;
  }
};

const startCustomerRegistrationVerification = async ({ name, email, passwordHash, phone }) => {
  const challengeId = crypto.randomUUID();
  const code = String(crypto.randomInt(100000, 1000000));
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      `DELETE FROM pending_customer_phone_verifications
       WHERE request_window_started_at < DATE_SUB(NOW(), INTERVAL 1 DAY)`
    );
    const [recent] = await connection.query(
      `SELECT request_count,
              DATE_FORMAT(request_window_started_at, '%Y-%m-%d %H:%i:%s') AS request_window_started_at,
              (request_window_started_at > DATE_SUB(NOW(), INTERVAL 2 MINUTE)) AS within_window,
              GREATEST(1, TIMESTAMPDIFF(SECOND, NOW(),
                DATE_ADD(request_window_started_at, INTERVAL 2 MINUTE))) AS retry_after_seconds
       FROM pending_customer_phone_verifications
       WHERE phone = ?
       ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [phone]
    );
    const lastRequest = recent[0];
    const withinWindow = Boolean(lastRequest && Number(lastRequest.within_window) === 1);
    if (withinWindow && Number(lastRequest.request_count) >= 3) {
      await connection.rollback();
      return {
        challenge_id: challengeId,
        email_sent: false,
        retry_after_seconds: Number(lastRequest.retry_after_seconds),
        message: registrationRequestMessage
      };
    }

    const [matchingUsers] = await connection.query(
      'SELECT id FROM users WHERE email = ? OR phone = ? LIMIT 1 FOR UPDATE',
      [email, phone]
    );
    const [matchingAdmins] = await connection.query(
      'SELECT id FROM admins WHERE email = ? LIMIT 1 FOR UPDATE',
      [email]
    );
    const canRegister = matchingUsers.length === 0 && matchingAdmins.length === 0;
    await connection.query(
      `UPDATE pending_customer_phone_verifications
       SET used_at = NOW()
       WHERE phone = ? AND used_at IS NULL`,
      [phone]
    );
    await connection.query(
      `INSERT INTO pending_customer_phone_verifications
       (challenge_id, name, email, password_hash, phone, delivery_channel, can_register, code_hash, attempts,
        request_count, request_window_started_at, expires_at)
       VALUES (?, ?, ?, ?, ?, 'email', ?, ?, 0, ?, IF(? = 1, ?, NOW()),
               DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
      [
        challengeId,
        canRegister ? name : null,
        canRegister ? email : null,
        canRegister ? passwordHash : null,
        phone,
        canRegister ? 1 : 0,
        codeHash(code),
        withinWindow ? Number(lastRequest.request_count) + 1 : 1,
        withinWindow ? 1 : 0,
        withinWindow ? lastRequest.request_window_started_at : null
      ]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const emailReady = emailConfigured();
  const emailSent = emailReady ? await deliverRegistrationCode(email, code) : false;
  if (!emailReady) {
    console.error('Customer registration email verification status: failed EMAIL_NOT_CONFIGURED');
  }

  return {
    challenge_id: challengeId,
    email_sent: emailSent,
    email_mode: emailMode(),
    email_error: emailSent ? '' : 'Email could not be delivered right now. Try sending another code later.',
    retry_after_seconds: 0,
    message: registrationRequestMessage
  };
};

const verifyCustomerRegistration = async (req, res) => {
  const challengeId = String(req.body.challenge_id || '').trim();
  const suppliedCode = String(req.body.code || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(challengeId) || !/^\d{6}$/.test(suppliedCode)) {
    return res.status(400).json({ message: invalidChallengeMessage });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [challenges] = await connection.query(
      `SELECT id, challenge_id, name, email, password_hash, phone, delivery_channel, can_register,
              code_hash, attempts, (expires_at <= NOW()) AS is_expired, used_at
       FROM pending_customer_phone_verifications
       WHERE challenge_id = ? AND delivery_channel = 'email' LIMIT 1 FOR UPDATE`,
      [challengeId]
    );
    const challenge = challenges[0];
    if (!challenge || challenge.used_at || Number(challenge.is_expired) === 1 || Number(challenge.attempts) >= 5) {
      await connection.rollback();
      return res.status(400).json({ message: invalidChallengeMessage });
    }

    const expected = Buffer.from(challenge.code_hash, 'hex');
    const supplied = Buffer.from(codeHash(suppliedCode), 'hex');
    const matches = expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
    if (!matches) {
      await connection.query(
        'UPDATE pending_customer_phone_verifications SET attempts = attempts + 1 WHERE id = ?',
        [challenge.id]
      );
      await connection.commit();
      return res.status(400).json({ message: invalidChallengeMessage });
    }

    if (Number(challenge.can_register) === 1) {
      const [matchingUsers] = await connection.query(
        'SELECT id FROM users WHERE email = ? OR phone = ? LIMIT 1 FOR UPDATE',
        [challenge.email, challenge.phone]
      );
      const [matchingAdmins] = await connection.query(
        'SELECT id FROM admins WHERE email = ? LIMIT 1 FOR UPDATE',
        [challenge.email]
      );
      if (matchingUsers.length === 0 && matchingAdmins.length === 0) {
        await connection.query(
          `INSERT INTO users
           (name, email, password, phone, role, status, verification_status, email_verified_at)
           VALUES (?, ?, ?, ?, 'customer', 'active', 'verified', NOW())`,
          [challenge.name, challenge.email, challenge.password_hash, challenge.phone]
        );
      }
    }
    await connection.query(
      `UPDATE pending_customer_phone_verifications
       SET used_at = NOW(), name = NULL, email = NULL, password_hash = NULL,
           code_hash = REPEAT('0', 64)
       WHERE id = ?`,
      [challenge.id]
    );
    await connection.commit();
    return res.status(202).json({
      verification_complete: true,
      message: registrationCompleteMessage
    });
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(202).json({
        verification_complete: true,
        message: registrationCompleteMessage
      });
    }
    console.error('Customer email registration verification failed:', error.code || error.message);
    return res.status(500).json({ message: 'Unable to verify this request right now.' });
  } finally {
    connection.release();
  }
};

const resendCustomerRegistrationCode = async (req, res) => {
  const challengeId = String(req.body.challenge_id || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(challengeId)) {
    return res.status(400).json({ message: invalidChallengeMessage });
  }

  const connection = await db.getConnection();
  let challenge;
  let code;
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT id, email, phone, delivery_channel, attempts, request_count, request_window_started_at,
              (request_window_started_at > DATE_SUB(NOW(), INTERVAL 2 MINUTE)) AS within_window,
              GREATEST(1, TIMESTAMPDIFF(SECOND, NOW(),
                DATE_ADD(request_window_started_at, INTERVAL 2 MINUTE))) AS retry_after_seconds,
              (expires_at <= NOW()) AS is_expired, used_at
       FROM pending_customer_phone_verifications
       WHERE challenge_id = ? AND delivery_channel = 'email' LIMIT 1 FOR UPDATE`,
      [challengeId]
    );
    challenge = rows[0];
    if (!challenge || challenge.used_at) {
      await connection.rollback();
      return res.json({ email_sent: false, message: registrationRequestMessage });
    }

    const withinWindow = Number(challenge.within_window) === 1;
    if (withinWindow && Number(challenge.request_count) >= 3) {
      await connection.rollback();
      return res.status(429).json({
        message: 'Too many verification requests. Try again later.',
        retry_after_seconds: Number(challenge.retry_after_seconds)
      });
    }

    code = String(crypto.randomInt(100000, 1000000));
    await connection.query(
      `UPDATE pending_customer_phone_verifications
       SET code_hash = ?, attempts = 0, expires_at = DATE_ADD(NOW(), INTERVAL 10 MINUTE),
           request_count = ?, request_window_started_at = IF(? = 1, request_window_started_at, NOW())
       WHERE id = ?`,
      [
        codeHash(code),
        withinWindow ? Number(challenge.request_count) + 1 : 1,
        withinWindow ? 1 : 0,
        challenge.id
      ]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error('Customer registration email resend failed:', error.code || error.message);
    return res.status(500).json({ message: 'Unable to resend the verification code right now.' });
  } finally {
    connection.release();
  }

  const emailReady = emailConfigured();
  const emailSent = emailReady ? await deliverRegistrationCode(challenge.email, code) : false;
  if (!emailReady) {
    console.error('Customer registration email verification status: failed EMAIL_NOT_CONFIGURED');
  }
  return res.json({
    email_sent: emailSent,
    email_mode: emailMode(),
    email_error: emailSent ? '' : 'Email could not be delivered right now. Try sending another code later.',
    message: registrationRequestMessage
  });
};

module.exports = {
  resendCustomerRegistrationCode,
  startCustomerRegistrationVerification,
  verifyCustomerRegistration,
  cleanupExpiredPhoneRegistrations: async () => {
    await db.query(
      `DELETE FROM pending_customer_phone_verifications
       WHERE expires_at <= NOW() OR request_window_started_at < DATE_SUB(NOW(), INTERVAL 1 DAY)`
    );
  }
};
