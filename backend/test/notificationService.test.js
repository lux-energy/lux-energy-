const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const nodemailer = require('nodemailer');

process.env.EMAIL_MODE = 'smtp';
process.env.SMTP_HOST = 'smtp.example.test';
process.env.SMTP_PORT = '587';
process.env.SMTP_SECURE = 'false';
process.env.SMTP_USER = 'test-smtp-user';
process.env.SMTP_PASS = crypto.randomBytes(32).toString('hex');
process.env.SMTP_FROM = 'Lux Energy <test-sender>';

let transportOptions;
let sentMessages = [];
let rejectDelivery = false;
nodemailer.createTransport = (options) => {
  transportOptions = options;
  return {
    async sendMail(message) {
      if (rejectDelivery) throw Object.assign(new Error(process.env.SMTP_PASS), { code: 'EAUTH' });
      sentMessages.push(message);
      return {};
    },
    async verify() {
      return true;
    }
  };
};

const notificationService = require('../src/services/notificationService');

test('SMS phone validation accepts valid Rwanda numbers and rejects malformed numbers', () => {
  assert.equal(notificationService.normalizeSmsPhone('+250788123456'), '+250788123456');
  assert.equal(notificationService.normalizeSmsPhone('0788123456'), '+250788123456');
  assert.equal(notificationService.normalizeSmsPhone('+14155552671'), '+14155552671');
  assert.equal(notificationService.normalizeSmsPhone('not a phone'), null);
  assert.throws(() => notificationService.sendSmsOTP('+250788123456', '12345'));
});

test('Infobip sends SMS using the configured account and trial sender', async () => {
  const previous = {
    baseUrl: process.env.INFOBIP_API_BASE_URL,
    apiKey: process.env.INFOBIP_API_KEY,
    sender: process.env.INFOBIP_SMS_SENDER,
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
    twilioFromNumber: process.env.TWILIO_FROM_NUMBER,
    fetch: global.fetch
  };
  const requests = [];
  const deliveryLogs = [];
  const originalInfo = console.info;
  const originalWarn = console.warn;
  console.info = (...args) => deliveryLogs.push(args.join(' '));
  console.warn = (...args) => deliveryLogs.push(args.join(' '));
  process.env.INFOBIP_API_BASE_URL = 'https://example.api.infobip.com/';
  process.env.INFOBIP_API_KEY = 'test-infobip-key';
  process.env.INFOBIP_SMS_SENDER = 'ServiceSMS';
  delete process.env.TWILIO_ACCOUNT_SID;
  delete process.env.TWILIO_AUTH_TOKEN;
  delete process.env.TWILIO_FROM_NUMBER;
  global.fetch = async (url, options) => {
    requests.push({ url, options });
    return { ok: true };
  };

  try {
    assert.equal(notificationService.smsConfigured(), true);
    await notificationService.sendSmsOTP('0788123456', '123456');
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, 'https://example.api.infobip.com/sms/2/text/advanced');
    assert.equal(requests[0].options.headers.Authorization, 'App test-infobip-key');
    assert.deepEqual(JSON.parse(requests[0].options.body), {
      messages: [{
        from: 'ServiceSMS',
        destinations: [{ to: '+250788123456' }],
        text: 'Your Lux Energy code to verify your Lux Energy account is 123456. It expires in 10 minutes. Do not share this code.'
      }]
    });
    assert.ok(deliveryLogs.some((line) => line.includes('accepted')));
    assert.equal(deliveryLogs.join('\n').includes('123456'), false);
    assert.equal(deliveryLogs.join('\n').includes('+250788123456'), false);

    global.fetch = async () => ({ ok: false, status: 401 });
    await assert.rejects(
      notificationService.sendSms('+250788123456', 'test'),
      (error) => error.code === 'SMS_DELIVERY_FAILED'
        && !error.message.includes(process.env.INFOBIP_API_KEY)
    );

    process.env.INFOBIP_API_BASE_URL = 'https://example.invalid';
    await assert.rejects(
      notificationService.sendSms('+250788123456', 'test'),
      (error) => error.code === 'SMS_PROVIDER_CONFIG_INVALID'
    );
  } finally {
    console.info = originalInfo;
    console.warn = originalWarn;
    global.fetch = previous.fetch;
    if (previous.baseUrl === undefined) delete process.env.INFOBIP_API_BASE_URL;
    else process.env.INFOBIP_API_BASE_URL = previous.baseUrl;
    if (previous.apiKey === undefined) delete process.env.INFOBIP_API_KEY;
    else process.env.INFOBIP_API_KEY = previous.apiKey;
    if (previous.sender === undefined) delete process.env.INFOBIP_SMS_SENDER;
    else process.env.INFOBIP_SMS_SENDER = previous.sender;
    if (previous.twilioAccountSid === undefined) delete process.env.TWILIO_ACCOUNT_SID;
    else process.env.TWILIO_ACCOUNT_SID = previous.twilioAccountSid;
    if (previous.twilioAuthToken === undefined) delete process.env.TWILIO_AUTH_TOKEN;
    else process.env.TWILIO_AUTH_TOKEN = previous.twilioAuthToken;
    if (previous.twilioFromNumber === undefined) delete process.env.TWILIO_FROM_NUMBER;
    else process.env.TWILIO_FROM_NUMBER = previous.twilioFromNumber;
  }
});

test('SMTP STARTTLS configuration, account codes, startup check, and safe delivery failures', async () => {
  assert.equal(notificationService.emailMode(), 'smtp');
  assert.equal(notificationService.emailConfigured(), true);
  assert.deepEqual(await notificationService.reportEmailConfiguration(), {
    configured: true,
    ready: true
  });

  const code = String(crypto.randomInt(100000, 1000000));
  await notificationService.sendEmailOTP('chosen recipient', code);
  await notificationService.sendPasswordResetOTP('chosen recipient', code);

  assert.equal(transportOptions.port, 587);
  assert.equal(transportOptions.secure, false);
  assert.equal(transportOptions.requireTLS, true);
  assert.equal(transportOptions.tls.minVersion, 'TLSv1.2');
  assert.equal(sentMessages[0].to, 'chosen recipient');
  assert.match(sentMessages[0].subject, /verification code/i);
  assert.match(sentMessages[0].text, new RegExp(code));
  assert.match(sentMessages[0].text, /expires in 10 minutes/i);
  assert.match(sentMessages[0].text, /do not share/i);
  assert.match(sentMessages[0].html, new RegExp(code));
  assert.equal(sentMessages[1].to, 'chosen recipient');
  assert.match(sentMessages[1].subject, /password reset code/i);
  assert.match(sentMessages[1].text, new RegExp(code));
  assert.match(sentMessages[1].text, /do not share/i);
  assert.throws(() => notificationService.sendEmailOTP('chosen recipient', '12345'));

  rejectDelivery = true;
  await assert.rejects(
    notificationService.sendEmail('chosen recipient', 'Test', 'Test'),
    (error) => error.code === 'EMAIL_DELIVERY_FAILED'
      && /could not be delivered/i.test(error.message)
      && !error.message.includes(process.env.SMTP_PASS)
  );

  process.env.EMAIL_MODE = 'invalid';
  assert.equal(notificationService.emailConfigured(), false);
});
