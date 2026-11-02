# Lux Energy staging test checklist

Run these checks only against an isolated staging deployment and a staging database populated with synthetic data. Do not copy production customer records, use production credentials, or make real payments.

## Required staging setup

### Access and test accounts

- A staging website URL and API URL, with confirmation they do not point to production.
- A QA customer account with a synthetic identity, active status, verified email, and a phone number registered in the SMS provider's test environment if SMS is tested.
- A QA station-agent account, active and assigned to a station containing synthetic inventory/services.
- A QA administrator account with permission to manage staging records.
- Access to a dedicated test mailbox or email sandbox that captures verification and password-reset emails.
- If staff approval flows are tested, a second administrator or test reviewer account.
- One-time access to the staging admin portal and agent/customer portals.

Use clearly synthetic addresses (for example, `qa.customer@<owned-test-domain>`) and synthetic names. Do not create any of these accounts in production.

## Deferred React Router security upgrade

The frontend currently uses `react-router-dom` v6. The dependency audit reports a moderate advisory affecting the installed v6 range and recommends v7.18.5, which is a major-version migration. This work does not upgrade the dependency; handle it as a separate branch/change set after these checks.

### Affected route surface

- Public: `/`, `/home`, `/about`, `/services`, `/products`, `/stations`, `/news`, `/news/:slug`, `/careers`, `/contact`.
- Authentication and recovery: `/login`, `/agent/login`, `/admin/login`, `/forgot-password`, `/forgot-password/:role`.
- Customer protected pages: `/portal`, `/portal/services`, `/portal/bills`, `/portal/tickets`; `/orders` redirects to `/portal`.
- Agent protected pages: `/agent`, `/agent/orders`, `/agent/services`, `/agent/billing`, `/agent/reports`.
- Admin protected pages: `/admin`, `/admin/reports`, `/admin/stations`, `/admin/products`, `/admin/services`, `/admin/news`, `/admin/careers`, `/admin/contact`, `/admin/users`, `/admin/orders`, `/admin/tickets`.
- Catch-all: `*` renders the branded not-found page. Route parameters, `Link`, `Navigate`, `useNavigate`, `useLocation`, and `ProtectedRoute` are used in addition to the route declarations.

### Migration and regression plan

1. Create a separate branch and update `react-router-dom` plus compatible test utilities in one reviewed dependency change; inspect the v7 migration notes for route matching, relative splat links, and router future-flag changes before editing.
2. Keep the existing route paths, role restrictions, fallback route, login recovery links, and redirect destinations unchanged. Resolve any v7 deprecation/runtime warnings without broad route redesign.
3. Run frontend lint, type-check, unit tests, and production build. Extend automated route tests for every route group above, the `/orders` redirect, unknown paths, `:slug` loading/not-found, and authentication-required redirects.
4. In a browser at desktop and mobile widths, verify public navigation, direct URL loads/refreshes, back/forward navigation, customer/agent/admin cross-role blocking, logout redirects, password-recovery links, and nested/splat navigation.
5. Compare the route sweep and console/network errors against the current v6 build. Merge only with no route regressions and a clean dependency audit for the affected packages.

## Stations API cold-start measurement

After restarting the isolated backend (or starting it from a stopped state), run one first-request measurement:

```powershell
Set-Location backend
npm run monitor:stations-cold-start
```

The check requests `http://127.0.0.1:5000/api/stations`, measures through response-body completion, and reports elapsed milliseconds plus HTTP status. It exits `2` and prints a slow-response warning when the response exceeds 3,000 ms; HTTP/network/time-out failures exit `1`. Configure `STATIONS_SLOW_THRESHOLD_MS` to override the threshold and `STATIONS_CHECK_TIMEOUT_MS` to set the 10-second default timeout. For confirmed isolated staging only, set `STATIONS_API_URL` and `STAGING_API_ORIGIN` to the staging endpoint and its exact origin. Do not point the check at production.

### Environment variables

Set these only in the staging secret store or private staging environment file. Do not commit values.

**Backend**

- `NODE_ENV=production` for a production-like staging runtime.
- `PORT`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` for the isolated staging database.
- `JWT_SECRET` — unique, long, randomly generated for staging.
- `FRONTEND_URL` — staging website origin.
- `EMAIL_MODE=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — credentials for the email sandbox/test mailbox, not a production sender.
- For SMS verification/reset tests, configure one staging provider only: `INFOBIP_API_BASE_URL`, `INFOBIP_API_KEY`, `INFOBIP_SMS_SENDER`, or `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, with provider sandbox/test credentials and a provider-authorized test recipient.
- Optional report scheduling: `REPORT_REMINDER_CRON`, `REPORT_TIMEZONE`.

**Frontend**

- `VITE_API_URL` — staging API base URL ending in `/api`.

**Payment test method:** the current UI is explicitly configured with demo bank/MoMo details and has no payment-gateway integration. In isolated staging, choose a displayed demo method and upload a synthetic JPG, PNG, WEBP, or PDF proof (maximum 10 MB) visibly marked `TEST ONLY — NO PAYMENT MADE`. Do not transfer money or enter real bank, MoMo, card, or transaction details. Use the proof to exercise review, rejection, and customer status updates only; the payment owner must confirm that staging review cannot trigger settlement or real notifications. If a provider-level payment test is required, it is blocked until the owner supplies an authorized sandbox integration and test credentials.

## Test cases

### Login and authorization

- [ ] Sign in with the synthetic customer account; confirm the customer portal loads and customer-only pages work.
- [ ] Sign in with the synthetic station-agent account; confirm it can see only its assigned station's work queue and services.
- [ ] Sign in with the synthetic admin account; confirm admin pages load.
- [ ] Try an incorrect password for each role; confirm a useful error appears and no authenticated session is created.
- [ ] Attempt admin-only API actions with the agent token; confirm the API rejects them with `403`.
- [ ] Sign out and verify protected pages redirect to the appropriate role's login.

### Password reset and email

- [ ] Request customer, agent, and admin reset codes using the staging test inbox.
- [ ] Confirm each email is captured by the sandbox, names the expected account type, and contains no credentials.
- [ ] Reset with a valid code and policy-compliant synthetic password; verify sign-in with the new password and rejection of the old one.
- [ ] Try an expired, incorrect, and already-used code; confirm each is rejected without changing the password.
- [ ] Request another code and exercise the rate limit without flooding the provider.
- [ ] If SMS is configured, repeat with the provider's authorized test number; otherwise mark SMS as not tested.

### Customer registration and email verification

- [ ] Register a new synthetic customer using a mailbox controlled by QA.
- [ ] Confirm the verification message is captured and the user cannot access the portal before verifying.
- [ ] Verify with the code; confirm the account is created/activated once and the portal becomes accessible.
- [ ] Test an incorrect/expired code and resend/rate-limit behavior.
- [ ] Confirm the staging data is synthetic and can be removed after testing.

### Orders and payments

- [ ] Submit an order with synthetic customer, product, quantity, station, and contact details.
- [ ] Confirm the correct assigned station agent can see the order; another station agent cannot.
- [ ] Exercise accepted/rejected/updated order states and confirm the customer sees the resulting status.
- [ ] Use only the payment owner's approved sandbox instructions or an explicitly synthetic proof upload; do not transfer funds.
- [ ] Confirm the agent/admin can review the proof, and that status changes appear correctly to the customer.
- [ ] Check invalid file types, oversized files, duplicate submissions, and rejection/resubmission paths.

### Staff and operations

- [ ] Have the assigned agent view customer-activated services for their station and update an allowed status.
- [ ] Confirm another station's agent cannot view or update that service.
- [ ] Exercise contact-message handling, tickets, billing, and daily report submission/review using synthetic records.
- [ ] Confirm admin-only operations remain inaccessible to customer and agent roles.
- [ ] Verify audit/history entries and notifications do not include passwords, reset codes, or provider secrets.
- [ ] Confirm all test records and uploaded files are removable without touching production data.

## Evidence and completion

- [ ] Record staging build identifier, test date, role used, and pass/fail for each case; redact email addresses, phone numbers, codes, and secrets from screenshots/logs.
- [ ] Record any provider-delivery IDs only if they are non-sensitive and permitted by the provider.
- [ ] Get business approval for team identities, staff photos, business metrics, and payment instructions before switching any placeholder to real public content.
- [ ] Do not deploy to production as part of this checklist.
