# Lux Energy

## Local backend setup

The backend uses a local MySQL server. In XAMPP, start MySQL from the XAMPP Control Panel. Create/select the `lux_energy_db` database, then apply the schema and sample data from the repository root using phpMyAdmin's **Import** tab:

1. Import `database/schema.sql`.
2. Import `database/seed.sql` if you want the sample records.
3. Import `database/migration-password-reset-account-role.sql` to prepare password-reset codes for customer and station-agent accounts. This migration invalidates any reset codes that existed before the migration; users can request fresh codes.
4. For an existing database that already uses email-only password reset codes, import `database/migration-password-reset-sms.sql` to enable SMS reset codes.
5. For an existing database, import `database/migration-customer-phone-registration.sql` once to add pending registration challenges.
6. For an existing database with phone-registration challenges, import `database/migration-customer-registration-email-verification.sql` once to switch registration verification to email. Outstanding phone registration challenges are no longer accepted.

If the database already exists and is in use, back it up before importing schema changes. The schema file uses `CREATE TABLE IF NOT EXISTS`; use the migration file for the existing password-reset table.

Copy `backend/.env.example` to `backend/.env` if needed, then set `DB_HOST=127.0.0.1`, `DB_PORT=3306` (or the port configured by MySQL), `DB_USER` and `DB_PASSWORD` for your local MySQL account, and `DB_NAME=lux_energy_db`. Confirm MySQL is running before starting the API; `ECONNREFUSED` means no MySQL server is accepting connections at the configured host and port. Fill the SMTP settings as described below. Start the API from the `backend` directory with `npm run dev` during development or `npm start` otherwise.

The API health check is available at `http://localhost:5000/api/health`.

## Frontend checks

Run these commands from the `frontend` directory:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

The test suite uses synthetic QA identities and mocked services; it does not contact the backend or send real messages. See [STAGING-TEST-CHECKLIST.md](./STAGING-TEST-CHECKLIST.md) for staging-only end-to-end checks and required test access.

See [STAGING-DEPLOYMENT.md](./STAGING-DEPLOYMENT.md) for the isolated Render staging Blueprint, DNS instructions, environment-variable requirements, and storage limitations. It is a manual plan; it does not create resources or change DNS.

## Real SMTP email delivery

Email verification and password-reset codes are delivered through Nodemailer. SMS codes use Twilio when configured. Real SMTP is the default. The API logs whether SMTP is configured at startup and checks the connection without printing credentials.

1. In `backend/.env`, set `EMAIL_MODE=smtp`.
2. Obtain SMTP credentials from your email provider and verify the sender address or domain with that provider. The address used for `SMTP_FROM` must be authorized; otherwise delivery may be rejected.
3. Fill in the SMTP values:
   - `SMTP_HOST`: the SMTP server address supplied by your email provider.
   - `SMTP_PORT=587`
   - `SMTP_SECURE=false` (the connection upgrades to TLS with STARTTLS).
   - `SMTP_USER` and `SMTP_PASS`: the SMTP credentials supplied by your email provider.
   - `SMTP_FROM`: `Lux Energy <no-reply@your-verified-domain.com>`, replacing the address with a sender verified by your provider.
4. Restart the backend. Check its startup output for “Real SMTP email delivery is configured” and “Email transport connection verified.” If configuration is missing or the connection check fails, the log names the missing setting or reports a safe error code; it never prints the password.

Never commit `backend/.env` or send SMTP credentials in chat. Keep them only in your local environment.

## SMS verification

New customer registration sends an email verification code before creating an account or saving the submitted details. The phone number is validated and saved with the account after email verification, but phone verification is not required during registration. A neutral response is returned for both available and already-used contact details. Existing customer email and SMS verification remain available where prompted during sign-in. For password recovery, customers choose either email or SMS before requesting a code; only the selected channel receives a code, and the reset request must specify that same channel. SMS recovery requires the submitted phone number to match the account's saved number and sends only to that number. Admin recovery remains email-only. Infobip is preferred when configured; Twilio remains available as a fallback provider. Infobip account-level trial and destination restrictions still apply.

To use Infobip, set `INFOBIP_API_BASE_URL` to the API base hostname shown in Infobip, set `INFOBIP_API_KEY` privately in `backend/.env`, and use the default sender `ServiceSMS` unless Infobip has authorized another sender in `INFOBIP_SMS_SENDER`. SMS codes expire after 10 minutes, allow at most five incorrect attempts, and are rate-limited to three requests per phone in two minutes. Delivery status logs never include verification codes or phone numbers. Expired pending registration records are cleaned up every 15 minutes.

New installations receive the pending-registration table from `database/schema.sql`.

Never commit `backend/.env` or share API keys in chat.

For a development-only delivery test, sign in as an admin, then send a JSON `to` address to `POST /api/dev/email-test` with the admin's bearer token. For example, in PowerShell:

```powershell
$token = Read-Host "Admin bearer token"
$body = @{ to = Read-Host "Email address to test" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/dev/email-test -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body $body
```

The endpoint is admin-protected, rate-limited, and not registered when `NODE_ENV=production`.

Mailpit and the Mailtrap sandbox are available only for explicit local testing. Set `EMAIL_MODE=local`; for Mailpit use `EMAIL_LOCAL_PROVIDER=mailpit`, and for Mailtrap Sandbox use `EMAIL_LOCAL_PROVIDER=mailtrap` plus that sandbox's SMTP values in `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS`. Local modes do not deliver messages to real customer inboxes.

## Password reset

Customer and station-agent login pages link to password recovery. The same API endpoints accept `role: "customer"` or `role: "agent"`:

- `POST /api/auth/password/forgot` with `{ "email": "...", "role": "customer", "channel": "email" }` (or `"sms"` and the registered `"phone"`) requests a reset code using only the selected channel. Station agents use the same `channel` field; admins receive email codes.
- `POST /api/auth/password/reset` with the email, role, selected `channel`, six-digit code, new password, and confirmation completes the reset. The code is checked only against the selected channel.

Requests are rate-limited and return a generic response so the API does not disclose whether an email is registered. Codes are generated securely, stored as keyed hashes, expire in 10 minutes, and older unused codes are invalidated when a new code is requested. A successful reset bcrypt-hashes the new password and returns the user to the appropriate sign-in page.

Customer registration sends a one-time code to the supplied email address. Customers can request password recovery after verifying their email or phone; they must choose one recovery channel for each request.

To verify delivery end-to-end, set the SMTP values in `backend/.env`, use an account whose registered email address you can access, and request its reset code from the customer or agent login page. Check that inbox (and its spam folder), then enter the code and a password meeting the existing strength rules. Never paste Gmail or SMTP credentials into chat. Gmail SMTP requires an app password with 2-Step Verification enabled.
