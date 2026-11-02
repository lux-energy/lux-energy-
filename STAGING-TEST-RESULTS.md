# Isolated staging test results

**Run date:** 2026-11-01  
**Scope:** Staging-only access attempt. No deployment, production endpoint, production data, or real payment was used.

## Local checks

- **Passed** — Frontend lint: zero errors and zero warnings.
- **Passed** — Frontend type-check.
- **Passed** — Frontend automated tests: 5 passed.
- **Passed** — Backend automated tests: 57 passed, 0 failed.
- **Passed** — Frontend production build.
- **Passed** — Local stations cold-start monitor: HTTP 200 in 301 ms, below the 3,000 ms threshold.
- **Passed** — Monitor threshold behavior: a controlled local 3,100 ms response measured 3,440 ms, emitted the slow-response warning, and exited with code 2.
- **Passed** — Local production-preview browser smoke test on desktop (1366 px) and mobile (390 px): `/home`, `/stations`, `/contact`, `/admin/login`, and an unknown route rendered their expected headings without horizontal overflow or page/network errors.
- **Passed** — Local contact form fields had associated labels, the empty required form was invalid, and both gallery images loaded.

These are local results and do not verify staging services, credentials, notifications, or data isolation.

## Staging endpoint readiness

- **Failed** — DNS lookup for `staging.luxenergy.com`: Windows DNS resolver returned `DNS name does not exist`.
- **Failed** — DNS lookup for `api-staging.luxenergy.com`: Windows DNS resolver returned `DNS name does not exist`.
- **Blocked** — HTTPS GET `https://staging.luxenergy.com/`: curl exit code `6`, `Could not resolve host`; HTTP status `000`, no remote IP, no redirect.
- **Blocked** — HTTPS GET `https://api-staging.luxenergy.com/api/health`: curl exit code `6`, `Could not resolve host`; HTTP status `000`, no remote IP, no redirect.

Neither hostname resolved, so the browser/API never reached an application server. These are endpoint-availability failures; no application behavior or account workflow could be assessed. No alternate hostname was guessed, and production was not contacted.

## Staging end-to-end test cases

Every case below is **Blocked** because the provided staging DNS names do not resolve. No credentials were entered and no mutations, emails, SMS, orders, uploads, or staff actions were sent.

### Login and authorization

- **Blocked** — Sign in with the synthetic customer account and load customer portal pages.
- **Blocked** — Sign in with the synthetic station-agent account; verify station-scoped queue/services.
- **Blocked** — Sign in with the synthetic admin account and load admin pages.
- **Blocked** — Wrong-password handling for customer, agent, and admin; verify no session is created.
- **Blocked** — Agent-token attempt to call admin-only API operations; expect `403`.
- **Blocked** — Logout and protected-page redirect for each role.

### Password reset and email

- **Blocked** — Request customer reset code and capture the message in the test inbox.
- **Blocked** — Request agent reset code and capture the message in the test inbox.
- **Blocked** — Request admin reset code and capture the message in the test inbox.
- **Blocked** — Verify email content identifies the expected account type and contains no credentials.
- **Blocked** — Complete reset with a valid code; sign in with the new password and reject the old password.
- **Blocked** — Reject incorrect, expired, and already-used reset codes without changing a password.
- **Blocked** — Exercise reset-request rate limiting without flooding a provider.
- **Blocked** — Authorized SMS reset delivery to the provider-authorized test recipient.

### Customer registration and verification

- **Blocked** — Register a synthetic customer with a QA-controlled test mailbox.
- **Blocked** — Capture verification email; verify the account cannot access the portal before verification.
- **Blocked** — Verify with a valid code and confirm the account activates once.
- **Blocked** — Reject incorrect/expired verification codes and exercise resend/rate-limit behavior.
- **Blocked** — Confirm synthetic test data can be removed after the run.

### Orders and payments

- **Blocked** — Create an order with synthetic customer, product, quantity, station, and contact data.
- **Blocked** — Verify the assigned station agent can see the order.
- **Blocked** — Verify an agent from another station cannot see the order.
- **Blocked** — Exercise accepted, rejected, and updated order states and confirm customer-visible status.
- **Blocked** — Upload only a synthetic proof marked `TEST ONLY — NO PAYMENT MADE`; no money transfer.
- **Blocked** — Verify agent/admin proof review and customer-visible payment status changes.
- **Blocked** — Reject invalid and oversized proof files; exercise duplicate, rejection, and resubmission cases.

### Staff and operations

- **Blocked** — Assigned agent views and updates a customer-activated service for its station.
- **Blocked** — Another station's agent is denied access to that service.
- **Blocked** — Contact-message handling, tickets, billing, and daily report submission/review using synthetic records.
- **Blocked** — Customer and agent attempts to perform admin-only operations are rejected.
- **Blocked** — Verify audit/history entries and notifications do not include passwords, reset codes, or provider secrets.
- **Blocked** — Confirm test records and uploads can be removed without affecting production data.

### Browser, form, session, and error cases

- **Blocked** — Public/customer/agent/admin key routes at mobile and desktop widths on staging.
- **Blocked** — Invalid form submissions and validation/error messages on staging.
- **Blocked** — API failure handling and failed-request UI states on staging.
- **Blocked** — Expired session handling and redirect behavior on staging.
- **Blocked** — Unauthorized and cross-role route/API access on staging.

**Application test failures:** None observed because requests never reached the application.  
**Failure evidence:** Exact DNS and curl errors are recorded above. A screenshot is not applicable; the browser displayed a network load failure before any page rendered.

## Required before resuming staging

- Restore/confirm DNS records and reachability for the exact staging frontend URL and API origin, then verify both resolve to the isolated environment. Isolation and payment-review safety have been confirmed; do not create or guess a domain as part of this test.
- Provision synthetic customer, station-agent, and administrator accounts and a station with synthetic orderable inventory (accounts and mail/SMS sandboxes were reported ready privately).
- Configure credentials only in an ignored private local environment file or secure secret store; do not send passwords, reset codes, SMTP secrets, or SMS provider keys in chat.
- Provide access to an email capture inbox and, if SMS is to be tested, an authorized SMS sandbox and test recipient.
- Use only a clearly marked synthetic proof; do not transfer money. Payment-review isolation has been confirmed.
- If obtaining valid staging origins requires creating a domain or DNS record, leave that work undone until explicitly requested; no domain or DNS changes are part of this test.
- Review [STAGING-TEST-CHECKLIST.md](./STAGING-TEST-CHECKLIST.md) before running tests.
