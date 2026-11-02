const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { passwordMeetsPolicy } = require('../middleware/validation');
const {
  normalizeSmsPhone,
  sendPasswordResetOTP,
  sendSmsOTP,
  smsConfigured
} = require('../services/notificationService');

const genericRequestMessage = 'If an account exists for this email, a reset code will be sent to its phone or email. If it does not arrive, try again later.';
const invalidCodeMessage = 'The reset code is invalid.';
const codeHash = (code) => crypto.createHmac('sha256', process.env.JWT_SECRET).update(code).digest('hex');
const validRoles = ['customer', 'agent', 'admin'];
const isDatabaseUnavailable = (error) => (
  ['ECONNREFUSED', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST'].includes(error.code)
);

const getAccount = async (email, role) => {
  if (role === 'admin') {
    const [admins] = await db.query('SELECT id, email FROM admins WHERE email = ? LIMIT 1', [email]);
    return admins[0]
      ? { accountId: admins[0].id, accountColumn: 'admin_id', accountRole: 'admin', email: admins[0].email }
      : null;
  }

  const [users] = await db.query(
    'SELECT id, email, phone, email_verified_at, phone_verified_at FROM users WHERE email = ? AND role = ? AND status = ? LIMIT 1',
    [email, role, 'active']
  );
  return users[0] && (role !== 'customer' || users[0].email_verified_at || users[0].phone_verified_at)
    ? {
      accountId: users[0].id,
      accountColumn: 'user_id',
      accountRole: role,
      email: users[0].email,
      phone: users[0].phone,
      phone_verified_at: users[0].phone_verified_at
    }
    : null;
};

const createAndSendResetCode = async (account, channel) => {
  const code = String(crypto.randomInt(100000, 1000000));
  const { accountColumn, accountId, accountRole } = account;
  const connection = await db.getConnection();
  let codeId;
  try {
    await connection.beginTransaction();
    await connection.query(
      `UPDATE password_reset_codes SET used_at = NOW()
       WHERE ${accountColumn} = ? AND account_role = ? AND used_at IS NULL`,
      [accountId, accountRole]
    );
    const [inserted] = await connection.query(
      `INSERT INTO password_reset_codes (${accountColumn}, account_role, code_hash, channel, expires_at)
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
      [accountId, accountRole, codeHash(code), channel]
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
      ? await sendSmsOTP(account.phone, code, 'password reset')
      : await sendPasswordResetOTP(account.email, code);
    if (!sent) {
      throw Object.assign(new Error(`${channel === 'sms' ? 'SMS' : 'Email'} delivery is not configured.`), {
        code: channel === 'sms' ? 'SMS_NOT_CONFIGURED' : 'EMAIL_NOT_CONFIGURED'
      });
    }
  } catch (error) {
    await db.query(
      'UPDATE password_reset_codes SET used_at = NOW() WHERE id = ?',
      [codeId]
    );
    throw error;
  }
};

const requestPasswordReset = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const role = req.body.role;
  const requestedChannel = role === 'admin' ? 'email' : req.body.channel;
  if (!email || !validRoles.includes(role) || !['sms', 'email'].includes(requestedChannel)) {
    return res.status(400).json({ message: 'Enter a valid email and account type.' });
  }

  try {
    const account = await getAccount(email, role);
    if (account) {
      const { accountColumn, accountId, accountRole } = account;
      const [recent] = await db.query(
        `SELECT COUNT(*) AS count FROM password_reset_codes
         WHERE ${accountColumn} = ? AND account_role = ?
           AND created_at >= DATE_SUB(NOW(), INTERVAL 2 MINUTE)`,
        [accountId, accountRole]
      );

      if (Number(recent[0].count) < 3) {
        const smsPhone = account.accountColumn === 'user_id'
          ? normalizeSmsPhone(account.phone)
          : null;
        const submittedPhone = req.body.phone ? normalizeSmsPhone(req.body.phone) : smsPhone;
        if (requestedChannel === 'sms') {
          if (!smsPhone || submittedPhone !== smsPhone || !smsConfigured()) {
            const reason = !smsPhone
              ? 'SMS_REGISTERED_PHONE_INVALID'
              : submittedPhone !== smsPhone
                ? 'SMS_PHONE_MISMATCH'
                : 'SMS_NOT_CONFIGURED';
            console.error('Password reset SMS unavailable:', reason);
          } else {
            try {
              await createAndSendResetCode({ ...account, phone: smsPhone }, 'sms');
            } catch (error) {
              if (isDatabaseUnavailable(error)) throw error;
              console.error('Password reset SMS delivery failed:', error.code || 'UNKNOWN_ERROR');
            }
          }
        } else {
          try {
            await createAndSendResetCode(account, 'email');
          } catch (error) {
            if (isDatabaseUnavailable(error)) throw error;
            console.error('Password reset email delivery failed:', error.code || 'UNKNOWN_ERROR');
          }
        }
      }
    }
  } catch (error) {
    console.error('Password recovery request failed:', error.code || error.message);
    if (isDatabaseUnavailable(error)) {
      return res.status(503).json({
        message: 'Password recovery is temporarily unavailable. Please try again later.'
      });
    }
  }

  return res.json({ message: genericRequestMessage });
};

const resetPassword = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const role = req.body.role;
  const requestedChannel = role === 'admin' ? 'email' : req.body.channel;
  const code = String(req.body.code || '').trim();
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  if (!email || !validRoles.includes(role) || !['email', 'sms'].includes(requestedChannel) || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ message: invalidCodeMessage });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'The passwords do not match.' });
  }
  if (!passwordMeetsPolicy(password)) {
    return res.status(400).json({ message: 'Password must be at least 12 characters and include uppercase, lowercase, a number, and a symbol.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    let account;
    if (role === 'admin') {
      const [admins] = await connection.query(
        'SELECT id, email FROM admins WHERE email = ? LIMIT 1 FOR UPDATE',
        [email]
      );
      account = admins[0] ? { accountId: admins[0].id, accountColumn: 'admin_id' } : null;
    } else {
      const [users] = await connection.query(
        'SELECT id, email, phone, email_verified_at, phone_verified_at FROM users WHERE email = ? AND role = ? AND status = ? LIMIT 1 FOR UPDATE',
        [email, role, 'active']
      );
      account = users[0] && (role !== 'customer' || users[0].email_verified_at || users[0].phone_verified_at)
        ? { accountId: users[0].id, accountColumn: 'user_id', accountRole: role }
        : null;
    }
    if (account?.accountColumn === 'admin_id') account.accountRole = 'admin';

    if (!account) {
      await connection.rollback();
      return res.status(400).json({ message: invalidCodeMessage });
    }

    const { accountColumn, accountId, accountRole } = account;
    const [codes] = await connection.query(
      `SELECT id, code_hash, attempts, used_at, expires_at, (expires_at <= NOW()) AS is_expired
       FROM password_reset_codes
       WHERE ${accountColumn} = ? AND account_role = ? AND channel = ?
       ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [accountId, accountRole, requestedChannel]
    );
    const resetCode = codes[0];
    if (!resetCode) {
      await connection.rollback();
      return res.status(400).json({ message: invalidCodeMessage });
    }
    if (Number(resetCode.is_expired) === 1) {
      if (!resetCode.used_at) {
        await connection.query('UPDATE password_reset_codes SET used_at = NOW() WHERE id = ?', [resetCode.id]);
        await connection.commit();
      } else {
        await connection.rollback();
      }
      return res.status(400).json({ message: 'The reset code has expired. Request a new code.' });
    }
    if (resetCode.attempts >= 5) {
      await connection.rollback();
      return res.status(429).json({ message: 'Too many incorrect reset-code attempts. Request a new code.' });
    }
    if (resetCode.used_at) {
      await connection.rollback();
      return res.status(400).json({ message: 'The reset code is invalid or has already been used. Request a new code.' });
    }

    const suppliedHash = Buffer.from(codeHash(code), 'hex');
    const storedHash = Buffer.from(resetCode.code_hash, 'hex');
    const matches = suppliedHash.length === storedHash.length && crypto.timingSafeEqual(suppliedHash, storedHash);
    if (!matches) {
      const nextAttempts = resetCode.attempts + 1;
      await connection.query(
        'UPDATE password_reset_codes SET attempts = ?, used_at = ? WHERE id = ?',
        [nextAttempts, nextAttempts >= 5 ? new Date() : null, resetCode.id]
      );
      await connection.commit();
      return res.status(nextAttempts >= 5 ? 429 : 400).json({
        message: nextAttempts >= 5
          ? 'Too many incorrect reset-code attempts. Request a new code.'
          : invalidCodeMessage
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    if (accountColumn === 'admin_id') {
      await connection.query('UPDATE admins SET password = ? WHERE id = ?', [hashedPassword, accountId]);
    } else {
      await connection.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, accountId]);
    }
    await connection.query('UPDATE password_reset_codes SET used_at = NOW() WHERE id = ?', [resetCode.id]);
    await connection.commit();
    return res.json({ message: 'Password reset successfully. Sign in with your new password.' });
  } catch (error) {
    await connection.rollback();
    console.error('Password reset failed:', error.code || error.message);
    return res.status(500).json({ message: 'Unable to reset password right now.' });
  } finally {
    connection.release();
  }
};

module.exports = { requestPasswordReset, resetPassword };
