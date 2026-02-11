# Phase 1 — Critical Security Fixes

**Priority:** IMMEDIATE (fix within hours, not days)
**Estimated Effort:** 2-3 hours total
**Risk if ignored:** Authentication bypass, payment fraud, credential theft

---

## Issue 1.1 — JWT Secret Exposed in Git History

**Severity:** CRITICAL
**File:** `.env` (root)
**Impact:** Anyone with repo access can forge valid JWT tokens

### Problem

The root `.env` file contains a real JWT secret that has been committed to git:

```
# .env line 7
JWT_SECRET=RiTP5HN28FOouF//X7AMaPv+LmqaeLNypLjo89VUV+c=
```

Even if the file is now in `.gitignore`, the secret persists in git history.

### Fix

**Step 1: Generate new secret**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

**Step 2: Update secret in production environment** (NOT in git-committed files)

**Step 3: Purge from git history**
```bash
# Option A: BFG Repo-Cleaner (recommended)
bfg --delete-files .env
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# Option B: git filter-repo
git filter-repo --path .env --invert-paths
```

**Step 4: Force-push cleaned history** (coordinate with team)

**Step 5: Invalidate all existing JWT tokens** (users will need to re-login)

### Verification

```bash
# Confirm .env not in git history
git log --all --full-history -- .env
# Should return empty after purge

# Confirm .gitignore has .env
grep "^\.env$" .gitignore
```

---

## Issue 1.2 — Hardcoded JWT Fallback Secret

**Severity:** CRITICAL
**File:** `packages/backend/src/infrastructure/auth/jwt.strategy.ts:17`
**Impact:** Complete authentication bypass if JWT_SECRET env var is missing

### Problem

```typescript
// jwt.strategy.ts line 17
const secret = configService.get('JWT_SECRET') || 'default-secret-key';
```

If `JWT_SECRET` is not set in the environment, the app silently falls back to `'default-secret-key'`. Any attacker can forge tokens with this known secret.

### Fix

```typescript
// jwt.strategy.ts line 17 — REPLACE
const secret = configService.get<string>('JWT_SECRET');
if (!secret) {
  throw new Error('FATAL: JWT_SECRET environment variable is required');
}
```

### Also Fix in auth.module.ts

Check `packages/backend/src/modules/auth/auth.module.ts` for similar pattern:

```typescript
// BEFORE
secret: configService.get('JWT_SECRET') || 'default-secret-key',

// AFTER
secret: (() => {
  const s = configService.get<string>('JWT_SECRET');
  if (!s) throw new Error('FATAL: JWT_SECRET environment variable is required');
  return s;
})(),
```

### Verification

```bash
# Unset JWT_SECRET and start app — should crash immediately
unset JWT_SECRET
cd packages/backend && npm run dev
# Expected: Error: FATAL: JWT_SECRET environment variable is required
```

---

## Issue 1.3 — Xendit Webhook Verification Bypass

**Severity:** CRITICAL
**File:** `packages/backend/src/application/use-cases/payments/handle-xendit-webhook.use-case.ts:109-116`
**Impact:** Attackers can inject fake payment confirmations if XENDIT_WEBHOOK_TOKEN is not configured

### Problem

```typescript
// handle-xendit-webhook.use-case.ts line 109-116
verifyCallback(token: string): boolean {
  if (!this.webhookToken) {
    this.logger.warn('XENDIT_WEBHOOK_TOKEN not configured - skipping verification');
    return true;  // ACCEPTS ALL WEBHOOKS WITHOUT VERIFICATION
  }
  return token === this.webhookToken;
}
```

If the `XENDIT_WEBHOOK_TOKEN` environment variable is not set, **every webhook call is accepted as valid**, regardless of source.

### Fix

```typescript
verifyCallback(token: string): boolean {
  if (!this.webhookToken) {
    this.logger.error('XENDIT_WEBHOOK_TOKEN not configured - rejecting webhook');
    throw new ForbiddenException('Webhook verification not configured');
  }
  return token === this.webhookToken;
}
```

### Also Check Midtrans

File: `packages/backend/src/application/use-cases/payments/handle-midtrans-webhook.use-case.ts`

Verify that `MIDTRANS_SERVER_KEY` has the same fail-closed behavior:
```typescript
if (!this.serverKey) {
  throw new ForbiddenException('MIDTRANS_SERVER_KEY not configured');
}
```

### Verification

```bash
# Test webhook without token configured
curl -X POST http://localhost:3001/api/v1/payments/webhook/xendit \
  -H "Content-Type: application/json" \
  -H "x-callback-token: fake-token" \
  -d '{"id": "test"}'
# Expected: 403 Forbidden
```

---

## Issue 1.4 — CORS Wildcard in Production

**Severity:** CRITICAL
**File:** `packages/backend/.env:19` and `packages/backend/src/main.ts:28-31`
**Impact:** Cross-site request forgery (CSRF) attacks from any domain

### Problem

```bash
# packages/backend/.env line 19
CORS_ORIGIN=*
```

```typescript
// main.ts line 28-31
app.enableCors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
  credentials: true,
});
```

`CORS_ORIGIN=*` combined with `credentials: true` is particularly dangerous — browsers block this combination, but it signals misconfiguration.

### Fix

**Step 1: Update `.env`**
```bash
# Development
CORS_ORIGIN=http://localhost:5173

# Production (example)
CORS_ORIGIN=https://app.tilopos.com,https://pos.tilopos.com
```

**Step 2: Add validation in `main.ts`**
```typescript
const corsOrigin = process.env.CORS_ORIGIN;
if (!corsOrigin) {
  throw new Error('CORS_ORIGIN environment variable is required');
}
if (corsOrigin === '*') {
  throw new Error('CORS_ORIGIN=* is not allowed. Specify explicit origins.');
}

app.enableCors({
  origin: corsOrigin.split(',').map(o => o.trim()),
  credentials: true,
});
```

### Verification

```bash
# Test CORS with unauthorized origin
curl -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS http://localhost:3001/api/v1/auth/login -v
# Expected: No Access-Control-Allow-Origin header for evil.com
```

---

## Issue 1.5 — Hardcoded Credentials in Docker Compose

**Severity:** CRITICAL
**Files:**
- `docker-compose.dev.yml` (lines 12, 15, 17, 65, 96)
- `docker-compose.yml` (lines 21, 24, 26, 46, 79)
**Impact:** Credentials visible in git, predictable defaults in production

### Problem

```yaml
# docker-compose.dev.yml
services:
  backend:
    environment:
      DATABASE_URL: postgresql://tilopos:tilopos_secret@postgres:5432/tilopos
      JWT_SECRET: dev-secret-change-in-production
      RABBITMQ_URL: amqp://tilo:tilopass@rabbitmq:5672

  postgres:
    environment:
      POSTGRES_PASSWORD: tilopos_secret

  rabbitmq:
    environment:
      RABBITMQ_DEFAULT_PASS: tilopass
```

Production `docker-compose.yml` has similar hardcoded fallbacks.

### Fix

**Step 1: Create `.env.docker` (gitignored)**
```bash
# .env.docker (DO NOT COMMIT)
POSTGRES_PASSWORD=<generate-strong-password>
RABBITMQ_PASSWORD=<generate-strong-password>
JWT_SECRET=<generate-with-crypto>
REDIS_PASSWORD=<generate-strong-password>
```

**Step 2: Update `docker-compose.dev.yml`**
```yaml
services:
  backend:
    env_file:
      - packages/backend/.env
    environment:
      DATABASE_URL: postgresql://tilopos:${POSTGRES_PASSWORD}@postgres:5432/tilopos
      RABBITMQ_URL: amqp://tilo:${RABBITMQ_PASSWORD}@rabbitmq:5672

  postgres:
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}

  rabbitmq:
    environment:
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
```

**Step 3: Update `docker-compose.yml` (production)** — same pattern, no fallback defaults

**Step 4: Add to `.gitignore`**
```
.env.docker
```

### Verification

```bash
# Ensure no hardcoded passwords remain
grep -rn "tilopos_secret\|tilopass\|dev-secret" docker-compose*.yml
# Expected: no matches
```

---

## Issue 1.6 — Elasticsearch Security Disabled

**Severity:** CRITICAL
**File:** `docker-compose.elk.yml:9`
**Impact:** Unauthenticated access to all application logs and monitoring data

### Problem

```yaml
# docker-compose.elk.yml line 9
elasticsearch:
  environment:
    - xpack.security.enabled=false
```

Elasticsearch is exposed on port 9200 without authentication. Anyone on the network can read all logs, which may contain:
- User IDs, business IDs
- API endpoints accessed
- Error details with internal paths
- Correlation IDs for request tracing

### Fix

```yaml
elasticsearch:
  environment:
    - xpack.security.enabled=true
    - ELASTIC_PASSWORD=${ELASTIC_PASSWORD}
    - xpack.security.http.ssl.enabled=false  # Enable in production
  ports:
    - "127.0.0.1:9200:9200"  # Bind to localhost only

kibana:
  environment:
    - ELASTICSEARCH_USERNAME=elastic
    - ELASTICSEARCH_PASSWORD=${ELASTIC_PASSWORD}
  ports:
    - "127.0.0.1:5601:5601"  # Bind to localhost only
```

Also update the backend ELK logger to include credentials:
```typescript
// elk-logger.service.ts
const client = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: {
    username: process.env.ELASTIC_USERNAME || 'elastic',
    password: process.env.ELASTIC_PASSWORD,
  },
});
```

### Verification

```bash
# After fix: should require auth
curl http://localhost:9200
# Expected: 401 Unauthorized

# With credentials: should work
curl -u elastic:$ELASTIC_PASSWORD http://localhost:9200
# Expected: 200 OK with cluster info
```

---

## Phase 1 Checklist

| # | Issue | File | Fix | Done |
|---|-------|------|-----|------|
| 1.1 | JWT secret in git | `.env` | Rotate + purge history | [ ] |
| 1.2 | JWT fallback secret | `jwt.strategy.ts:17` | Throw error, no fallback | [ ] |
| 1.3 | Xendit webhook bypass | `handle-xendit-webhook.use-case.ts:112` | Reject if no token | [ ] |
| 1.4 | CORS wildcard | `.env:19`, `main.ts:28` | Explicit origins only | [ ] |
| 1.5 | Hardcoded Docker creds | `docker-compose*.yml` | Use env vars | [ ] |
| 1.6 | ELK security disabled | `docker-compose.elk.yml:9` | Enable xpack security | [ ] |

**After completing Phase 1:** Re-run security scan to verify all critical issues resolved before moving to Phase 2.
