# Isolated zero-cost Render staging setup

This config is limited to the two requested free services. No Render service, DNS record, secret, production setting, or production data has been changed.

## Prepared resources

- `render.staging.yaml` defines a free API web service `lux-energy-staging-api` and free static site `lux-energy-staging-web`; auto-deploy is off.
- Expected service URLs are `https://lux-energy-staging-api.onrender.com` and `https://lux-energy-staging-web.onrender.com`.
- The API allows browser origins only from the staging static-site URL via `CORS_ALLOWED_ORIGINS`.
- Render Free web services do not support persistent disks. Uploads and payment proofs remain on ephemeral local storage and may be lost on redeploy, restart, or spin-down. No persistent disk or paid storage is configured.
- The repo currently uses `mysql2` and MySQL SQL. Render's free managed database is PostgreSQL and is not compatible without a separate database-driver/schema migration. No database is provisioned or configured by this two-service blueprint.
- Email and SMS credentials are intentionally omitted. The app can start and health-check without them, but verification/recovery delivery and SMS workflows remain unconfigured until sandbox values are entered privately.

## Important Render free limits

- Free web services spin down after 15 minutes without inbound traffic and can take around a minute to wake.
- Their local filesystem is ephemeral; uploaded images and private receipts are not durable.
- Render Free Postgres, if used separately, expires after 30 days and is incompatible with the current MySQL driver/code.
- Render assigns free `onrender.com` service URLs. This setup uses no custom domain or DNS.

## Render Dashboard steps

1. Sign in to the Render Dashboard. Choose **New → Blueprint**.
2. Select repository `chicco-tech/lux-energy-testing`, branch `staging/render-isolation`, and Blueprint path `render.staging.yaml`.
3. Before creating resources, confirm the preview contains **only** `lux-energy-staging-api` on the **Free** plan and `lux-energy-staging-web` as a static site. Confirm there is **no** database resource, persistent disk, custom domain, or production resource.
4. Create/deploy the Blueprint. The initial creation/deploy requires your confirmation. Future deploys remain manual because `autoDeployTrigger` is `off`.
5. In API service → **Environment**, verify:
   - `NODE_ENV=production`
   - `JWT_SECRET` is a newly generated Render value
   - `CORS_ALLOWED_ORIGINS=https://lux-energy-staging-web.onrender.com`
6. In static service → **Environment**, verify:
   - `VITE_API_URL=https://lux-energy-staging-api.onrender.com/api`
7. Wait for both deploys to complete. Confirm the two service URLs shown by Render match those values; if Render assigned different hostnames, update the API CORS value and static `VITE_API_URL` to those exact staging URLs, then manually redeploy the static site.
8. Verify only the staging API `/api/health` and the CORS behavior before any synthetic tests.

## Database decision required before account/order workflows

Do not set the MySQL variables to production values. The Blueprint deliberately has no DB credentials. To enable registration, login, station/product data, orders, and staff workflows, you need an independently provisioned **staging MySQL-compatible database** with synthetic-only records and a staging-only account. The free Render Postgres offering cannot be connected to the current MySQL2 backend as-is.

Once an isolated MySQL-compatible database exists, enter its connection values privately in Render API service → **Environment**:

```text
DB_HOST=<staging MySQL host>
DB_PORT=<staging MySQL port>
DB_USER=<staging-only database user>
DB_PASSWORD=<staging-only database password>
DB_NAME=<staging-only database/schema>
DB_SSL=true
```

Confirm the database identity and TLS support before saving/redeploying. Never paste these values in chat.

## Email/SMS sandbox setup

Only if you want to test those flows, add sandbox credentials privately under API service → **Environment**, then manually redeploy the API.

For a Mailtrap email sandbox:

```text
EMAIL_MODE=local
EMAIL_LOCAL_PROVIDER=mailtrap
SMTP_HOST=<Mailtrap sandbox SMTP host>
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<Mailtrap sandbox username>
SMTP_PASS=<Mailtrap sandbox password>
SMTP_FROM=<authorized sandbox sender>
```

For SMS, use **one** provider's authorized test account and test recipient only:

```text
# Infobip option
INFOBIP_API_BASE_URL=<sandbox/account API base>
INFOBIP_API_KEY=<sandbox key>
INFOBIP_SMS_SENDER=<authorized test sender>

# Or Twilio option
TWILIO_ACCOUNT_SID=<test account SID>
TWILIO_AUTH_TOKEN=<test auth token>
TWILIO_FROM_NUMBER=<authorized test number>
```

Do not use production sender accounts, real customer numbers, or send messages to people who have not agreed to receive test messages.

## Exact DNS/Domains

None. This free staging setup uses the Render-assigned `onrender.com` URLs only. Do not add a custom domain or DNS records.

## Safe scope and known blockers

- **Health/routing/CORS:** can be verified without a database or notification credentials.
- **Registration/login/orders/staff flows:** blocked until a separate compatible staging MySQL database is configured and populated synthetically.
- **Email/SMS:** blocked until authorized sandbox credentials are configured privately.
- **Uploads/payment proofs:** can be smoke-tested only as temporary file handling; data may disappear on free-service restart/spin-down. Do not treat free ephemeral storage as durable.
- **Payments:** the app has no live gateway integration. Use only a synthetic proof labeled `TEST ONLY — NO PAYMENT MADE`; never transfer money.
- **Costs:** choose Free only for the two listed services. Do not accept any plan upgrade or paid storage prompt.
