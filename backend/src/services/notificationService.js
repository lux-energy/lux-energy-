require('dotenv').config();
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const { parsePhoneNumberFromString } = require('libphonenumber-js/max');

let emailTransporter;

const emailMode = () => {
  const mode = String(process.env.EMAIL_MODE || 'smtp').trim().toLowerCase();
  return ['smtp', 'local'].includes(mode) ? mode : 'invalid';
};

const localEmailProvider = () => (
  String(process.env.EMAIL_LOCAL_PROVIDER || 'mailpit').trim().toLowerCase()
);

const smtpConfiguration = ({ local = false } = {}) => {
  const port = Number(process.env.SMTP_PORT || 587);
  const secureValue = String(process.env.SMTP_SECURE || 'false').trim().toLowerCase();
  const secure = secureValue === 'true';
  const missing = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM']
    .filter((name) => !process.env[name]?.trim());

  if (!['true', 'false'].includes(secureValue)) {
    missing.push('SMTP_SECURE=true or SMTP_SECURE=false');
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    missing.push('a valid SMTP_PORT');
  } else if (!local && (port !== 587 || secure)) {
    missing.push('SMTP_PORT=587 and SMTP_SECURE=false (STARTTLS)');
  } else if (local && secure && port !== 465) {
    missing.push('SMTP_SECURE=true only with SMTP_PORT=465');
  }

  return {
    configured: missing.length === 0,
    missing,
    options: {
      host: process.env.SMTP_HOST,
      port,
      secure: local && secure,
      requireTLS: !(local && secure),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: { minVersion: 'TLSv1.2' }
    }
  };
};

const emailConfiguration = () => {
  const mode = emailMode();
  if (mode === 'smtp') return { ...smtpConfiguration(), mode };
  if (mode !== 'local') {
    return { configured: false, missing: ['EMAIL_MODE=smtp or EMAIL_MODE=local'], mode };
  }

  const provider = localEmailProvider();
  if (provider === 'mailtrap') {
    return { ...smtpConfiguration({ local: true }), mode, provider };
  }
  if (provider === 'mailpit') {
    const missing = ['SMTP_FROM'].filter((name) => !process.env[name]?.trim());
    const port = Number(process.env.MAILPIT_PORT || 1025);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      missing.push('a valid MAILPIT_PORT');
    }
    return {
      configured: missing.length === 0,
      missing,
      mode,
      provider,
      options: {
        host: process.env.MAILPIT_HOST || 'localhost',
        port,
        secure: false
      }
    };
  }

  return {
    configured: false,
    missing: ['EMAIL_LOCAL_PROVIDER=mailpit or EMAIL_LOCAL_PROVIDER=mailtrap'],
    mode
  };
};

const emailConfigured = () => emailConfiguration().configured;

const getEmailTransporter = (configuration) => {
  if (!emailTransporter) {
    emailTransporter = nodemailer.createTransport(configuration.options);
  }
  return emailTransporter;
};

const emailDeliveryError = (message, code) => Object.assign(new Error(message), { code });

const sendEmail = async (to, subject, text, html) => {
  const configuration = emailConfiguration();
  if (!configuration.configured) {
    throw emailDeliveryError(
      'Email delivery is not configured. Please try again later.',
      'EMAIL_NOT_CONFIGURED'
    );
  }

  const from = process.env.SMTP_FROM;
  try {
    await getEmailTransporter(configuration).sendMail({ from, to, subject, text, html });
  } catch {
    throw emailDeliveryError('Email could not be delivered. Please try again later.', 'EMAIL_DELIVERY_FAILED');
  }
  return true;
};

const sendOneTimeCodeEmail = (to, code, purpose) => {
  if (!/^\d{6}$/.test(code)) {
    throw new Error('Email verification code must be six digits');
  }

  const isPasswordReset = purpose === 'password reset';
  const subject = isPasswordReset
    ? 'Your Lux Energy password reset code'
    : 'Your Lux Energy verification code';
  const action = isPasswordReset ? 'reset your password' : 'verify your email';
  const text = `Use this Lux Energy code to ${action}: ${code}. It expires in 10 minutes. Do not share this code with anyone, including Lux Energy staff. If you did not request this code, you can ignore this email.`;
  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f3f6f4;font-family:Arial,Helvetica,sans-serif;color:#24332c;">
    <table role="presentation" style="width:100%;max-width:560px;margin:0 auto;border-collapse:collapse;background:#ffffff;border:1px solid #dce5df;">
      <tr><td style="padding:28px 32px;background:#174e3a;color:#ffffff;">
        <p style="margin:0;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#e5c86b;">Lux Energy Rwanda</p>
        <h1 style="margin:10px 0 0;font-size:24px;line-height:1.3;">${isPasswordReset ? 'Reset your password' : 'Verify your email'}</h1>
      </td></tr>
      <tr><td style="padding:28px 32px;">
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Use this one-time code to ${action}:</p>
        <div style="margin:22px 0;padding:18px;border:1px solid #dce5df;background:#f7faf8;text-align:center;">
          <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#174e3a;">${code}</span>
        </div>
        <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#52635a;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone. Lux Energy staff will never ask you for this code.</p>
        <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#68776f;">If you did not request this code, ignore this message.</p>
      </td></tr>
      <tr><td style="padding:16px 32px;border-top:1px solid #e7ede9;font-size:12px;color:#68776f;">Automated account security message from Lux Energy Rwanda.</td></tr>
    </table>
  </body>
</html>`;

  return sendEmail(to, subject, text, html);
};

const sendEmailOTP = (userEmail, otpCode) => (
  sendOneTimeCodeEmail(userEmail, String(otpCode), 'verification')
);

const sendPasswordResetOTP = (userEmail, otpCode) => (
  sendOneTimeCodeEmail(userEmail, String(otpCode), 'password reset')
);

const reportEmailConfiguration = async () => {
  const configuration = emailConfiguration();
  if (!configuration.configured) {
    console.error(
      'Real SMTP email delivery is NOT configured. Set:',
      configuration.missing.join(', ')
    );
    return { configured: false, ready: false };
  }

  if (configuration.mode === 'local') {
    console.warn(
      configuration.provider === 'mailpit'
        ? 'Local email delivery is enabled with Mailpit; messages will not reach real inboxes.'
        : 'Local email delivery is enabled with the Mailtrap sandbox; messages will not reach real inboxes.'
    );
  } else {
    console.log('Real SMTP email delivery is configured; checking STARTTLS connection.');
  }

  try {
    await getEmailTransporter(configuration).verify();
    console.log('Email transport connection verified.');
    return { configured: true, ready: true };
  } catch (error) {
    console.error('Email transport connection check failed:', error.code || 'UNKNOWN_ERROR');
    return { configured: true, ready: false };
  }
};

const infobipSmsConfigured = () => Boolean(
  process.env.INFOBIP_API_KEY?.trim()
  && process.env.INFOBIP_API_BASE_URL?.trim()
);

const twilioSmsConfigured = () => Boolean(
  process.env.TWILIO_ACCOUNT_SID?.trim()
  && process.env.TWILIO_AUTH_TOKEN?.trim()
  && process.env.TWILIO_FROM_NUMBER?.trim()
);

const smsConfigured = () => infobipSmsConfigured() || twilioSmsConfigured();

const normalizeSmsPhone = (phone) => {
  const parsed = parsePhoneNumberFromString(String(phone || '').trim(), 'RW');
  return parsed?.isValid() && parsed.number.startsWith('+') ? parsed.number : null;
};

const sendInfobipSms = async (to, body) => {
  const baseUrl = process.env.INFOBIP_API_BASE_URL.trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');
  if (!/^[a-z0-9-]+\.api\.infobip\.com$/i.test(baseUrl)) {
    throw Object.assign(new Error('Infobip API base URL is invalid.'), {
      code: 'SMS_PROVIDER_CONFIG_INVALID'
    });
  }

  let response;
  try {
    response = await fetch(`https://${baseUrl}/sms/2/text/advanced`, {
      method: 'POST',
      headers: {
        Authorization: `App ${process.env.INFOBIP_API_KEY.trim()}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        messages: [{
          from: process.env.INFOBIP_SMS_SENDER?.trim() || 'ServiceSMS',
          destinations: [{ to }],
          text: body
        }]
      }),
      signal: AbortSignal.timeout(10000)
    });
  } catch {
    throw Object.assign(new Error('SMS could not be delivered. Please try again later.'), {
      code: 'SMS_DELIVERY_FAILED'
    });
  }

  if (!response.ok) {
    throw Object.assign(new Error('SMS could not be delivered. Please try again later.'), {
      code: 'SMS_DELIVERY_FAILED',
      status: response.status
    });
  }
  return true;
};

const sendSms = async (to, body) => {
  if (!smsConfigured()) {
    return false;
  }

  const normalizedPhone = normalizeSmsPhone(to);
  if (!normalizedPhone) {
    throw Object.assign(new Error('A valid contact phone is required for SMS delivery.'), {
      code: 'SMS_INVALID_PHONE'
    });
  }

  try {
    if (infobipSmsConfigured()) {
      const accepted = await sendInfobipSms(normalizedPhone, body);
      console.info('SMS provider delivery status: accepted');
      return accepted;
    }

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
      body,
      from: process.env.TWILIO_FROM_NUMBER,
      to: normalizedPhone
    });
    console.info('SMS provider delivery status: accepted');
    return true;
  } catch (error) {
    console.warn('SMS provider delivery status: failed', error.code || 'UNKNOWN_ERROR');
    throw error;
  }
};

const sendSmsOTP = (phone, otpCode, purpose = 'verification') => {
  const code = String(otpCode);
  if (!/^\d{6}$/.test(code)) {
    throw new Error('SMS verification code must be six digits');
  }
  const action = purpose === 'password reset' ? 'reset your Lux Energy password' : 'verify your Lux Energy account';
  return sendSms(phone, `Your Lux Energy code to ${action} is ${code}. It expires in 10 minutes. Do not share this code.`);
};

module.exports = {
  emailConfigured,
  emailMode,
  infobipSmsConfigured,
  normalizeSmsPhone,
  reportEmailConfiguration,
  smsConfigured,
  sendEmail,
  sendEmailOTP,
  sendPasswordResetOTP,
  sendSms,
  sendSmsOTP
};
