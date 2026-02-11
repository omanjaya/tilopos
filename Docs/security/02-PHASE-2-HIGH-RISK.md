# Phase 2 — High Risk Security Hardening

**Priority:** Fix within 1 week (after Phase 1 is complete)
**Estimated Effort:** 1-2 days total
**Prerequisite:** All Phase 1 issues must be resolved first

---

## Issue 2.1 — Token Storage in localStorage (XSS Vulnerable)

**Severity:** HIGH
**Files:**
- `packages/web/src/stores/auth.store.ts:15-20`
- `packages/web/src/hooks/realtime/socket.util.ts:31`
- `packages/web/src/hooks/use-offline-pos.ts:224`
- 4+ additional files with direct `localStorage.getItem('token')`
**Impact:** If any XSS vulnerability exists, attacker can steal JWT tokens

### Problem

```typescript
// auth.store.ts
setAuth: (user, token) => {
  localStorage.setItem('token', token);          // XSS accessible
  localStorage.setItem('user', JSON.stringify(user));
  set({ user, token, isAuthenticated: true });
},
```

7+ locations directly access `localStorage.getItem('token')` instead of going through the Zustand store, creating scattered token access points.

### Fix

**Option A: httpOnly Cookies (Recommended)**

Backend changes:
```typescript
// auth.controller.ts — set token as httpOnly cookie
@Post('login')
async login(@Body() dto: LoginDto, @Res() res: Response) {
  const { token, user } = await this.authService.login(dto);
  res.cookie('access_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  return res.json({ user }); // Don't send token in body
}
```

Frontend changes:
```typescript
// api/client.ts — remove manual token attachment
// Cookies are sent automatically by browser with credentials: 'include'
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 30000,
  withCredentials: true, // Send cookies automatically
});
// Remove request interceptor that attaches Authorization header
```

**Option B: In-Memory Token (Simpler, partial fix)**

If httpOnly cookies are too complex to implement now:
```typescript
// auth.store.ts — keep token in memory only, not localStorage
setAuth: (user, token) => {
  // DON'T store token in localStorage
  localStorage.setItem('user', JSON.stringify(user));
  set({ user, token, isAuthenticated: true });
},
```

Note: Option B means tokens are lost on page refresh (user must re-login).

### Centralize Token Access

Regardless of storage method, consolidate all 7+ direct `localStorage.getItem('token')` calls:

```typescript
// Create a single token accessor
export function getAuthToken(): string | null {
  return useAuthStore.getState().token;
}
```

Replace all direct access:
- `packages/web/src/hooks/realtime/socket.util.ts:31`
- `packages/web/src/hooks/use-offline-pos.ts:224`
- `packages/web/src/features/inventory/batch-tracking-page.tsx:66`
- `packages/web/src/features/inventory/price-tiers-page.tsx:148`
- `packages/web/src/features/inventory/unit-conversion-page.tsx:131`
- `packages/web/src/features/inventory/serial-numbers-page.tsx:63`
- `packages/web/src/features/kds/hooks/useKdsSocket.ts:20`

### Verification

```javascript
// In browser console — token should NOT be accessible
localStorage.getItem('token');  // Should return null
document.cookie;                // Should NOT show access_token (httpOnly)
```

---

## Issue 2.2 — Sensitive Fields in Employee API Response

**Severity:** HIGH
**File:** `packages/backend/src/infrastructure/repositories/prisma-employee.repository.ts:165-175`
**Impact:** Employee PINs and MFA secrets exposed via API

### Problem

```typescript
// prisma-employee.repository.ts mapToRecord method
private mapToRecord(employee: any): EmployeeRecord {
  return {
    id: employee.id,
    // ... other fields
    pin: employee.pin,           // HASHED PIN EXPOSED
    mfaSecret: employee.mfaSecret, // 2FA SECRET EXPOSED
    // ...
  };
}
```

While the PIN is hashed, exposing hashes is unnecessary. The MFA secret is particularly dangerous — it allows anyone to generate valid TOTP codes.

### Fix

```typescript
// Option 1: Exclude from mapToRecord entirely
private mapToRecord(employee: any): EmployeeRecord {
  return {
    id: employee.id,
    // ... other fields
    // pin: employee.pin,           // REMOVED
    // mfaSecret: employee.mfaSecret, // REMOVED
  };
}

// Option 2: Create separate method for auth-only queries
private mapToAuthRecord(employee: any): EmployeeAuthRecord {
  return {
    id: employee.id,
    email: employee.email,
    pin: employee.pin,
    mfaSecret: employee.mfaSecret,
    role: employee.role,
    isActive: employee.isActive,
  };
}
```

Also add Prisma select to exclude sensitive fields from general queries:

```typescript
// In findByBusinessId — explicitly exclude
async findByBusinessId(businessId: string): Promise<EmployeeRecord[]> {
  const employees = await this.prisma.employee.findMany({
    where: { businessId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      // pin: false (not selected)
      // mfaSecret: false (not selected)
    },
  });
}
```

### Verification

```bash
# API response should NOT contain pin or mfaSecret
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/employees
# Check response body for absence of pin/mfaSecret
```

---

## Issue 2.3 — Google OAuth Signature Not Verified

**Severity:** HIGH
**File:** `packages/backend/src/modules/auth/auth.service.ts:75-119`
**Impact:** Attacker can craft fake Google OAuth tokens

### Problem

```typescript
// auth.service.ts line 75-119 — Manual JWT parsing
const parts = credential.split('.');
if (parts.length !== 3) throw new UnauthorizedException('Invalid Google token');

const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
const payload = JSON.parse(payloadJson);

// Only checks format and expiration — NOT the cryptographic signature
if (payload.exp && payload.exp * 1000 < Date.now()) {
  throw new UnauthorizedException('Token expired');
}
```

The JWT signature (part 3) is completely ignored. An attacker can modify the payload and the app will accept it.

### Fix

Install Google's official library:
```bash
cd packages/backend
npm install google-auth-library
```

Replace manual parsing:
```typescript
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async verifyGoogleToken(credential: string) {
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload) throw new UnauthorizedException('Invalid Google token');

  return {
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
    googleId: payload.sub,
    emailVerified: payload.email_verified,
  };
}
```

### Verification

```bash
# Craft a fake Google token (should be rejected)
FAKE_TOKEN="eyJhbGciOiJSUzI1NiJ9.eyJlbWFpbCI6ImZha2VAZ21haWwuY29tIiwiZXhwIjo5OTk5OTk5OTk5fQ.fake"
curl -X POST http://localhost:3001/api/v1/auth/google \
  -H "Content-Type: application/json" \
  -d "{\"credential\": \"$FAKE_TOKEN\"}"
# Expected: 401 Unauthorized
```

---

## Issue 2.4 — Missing Security Headers in Nginx

**Severity:** HIGH
**File:** `packages/web/nginx.conf`
**Impact:** Clickjacking, MIME sniffing, missing transport security

### Problem

The nginx configuration serves the SPA but includes no security headers. The frontend is vulnerable to:
- **Clickjacking** (no X-Frame-Options)
- **MIME type sniffing** (no X-Content-Type-Options)
- **Protocol downgrade** (no Strict-Transport-Security)
- **Code injection** (no Content-Security-Policy)

### Fix

Add security headers to nginx.conf:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # HSTS (enable when using HTTPS)
    # add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # CSP (adjust based on actual resource origins)
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' wss:; frame-ancestors 'none';" always;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Verification

```bash
# Check response headers
curl -I https://app.tilopos.com
# Expected headers present:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Content-Security-Policy: ...
```

---

## Issue 2.5 — Source Maps Enabled in Production

**Severity:** HIGH
**File:** `packages/web/vite.config.ts:80`
**Impact:** Full source code exposed in browser DevTools

### Problem

```typescript
// vite.config.ts line 80
build: {
  sourcemap: true,  // ALWAYS enabled, even in production
}
```

Source maps allow anyone to view the original TypeScript source code, including:
- Business logic
- API endpoint patterns
- Auth flow implementation
- Internal component structure

### Fix

```typescript
// vite.config.ts
build: {
  sourcemap: process.env.NODE_ENV !== 'production',
  // Or use 'hidden' to generate maps but not reference them in bundles
  // sourcemap: 'hidden',
}
```

If you need source maps for error tracking (e.g., Sentry), use `'hidden'` mode and upload maps to Sentry directly:

```typescript
build: {
  sourcemap: 'hidden', // Generate maps but don't link in JS files
}
```

Then upload to Sentry during CI/CD:
```bash
npx @sentry/cli sourcemaps upload ./dist/assets --release=$VERSION
```

### Verification

```bash
# After build: no .map references in JS files
cd packages/web && npm run build
grep -r "sourceMappingURL" dist/assets/*.js
# Expected: no matches (for 'hidden' or false)
```

---

## Issue 2.6 — Environment Variable Validation at Startup

**Severity:** HIGH
**File:** `packages/backend/src/main.ts`
**Impact:** App runs with missing/insecure configuration, fails at runtime instead of startup

### Problem

No validation of required environment variables at application startup. Missing vars cause runtime errors (e.g., JWT operations fail, database connections fail) rather than clear startup failures.

### Fix

Add validation in `main.ts` before app bootstrap:

```typescript
// main.ts — add at the top, before NestFactory.create()
function validateEnvironment() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_EXPIRES_IN',
    'REDIS_HOST',
  ];

  const conditionalRequired: Record<string, string> = {
    'XENDIT_WEBHOOK_TOKEN': 'Xendit payment webhooks will be rejected',
    'MIDTRANS_SERVER_KEY': 'Midtrans payment webhooks will be rejected',
    'GOOGLE_CLIENT_ID': 'Google OAuth will be disabled',
  };

  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `FATAL: Missing required environment variables:\n${missing.map(k => `  - ${k}`).join('\n')}`
    );
  }

  // Warn about optional but important vars
  Object.entries(conditionalRequired).forEach(([key, warning]) => {
    if (!process.env[key]) {
      console.warn(`WARNING: ${key} not set — ${warning}`);
    }
  });

  // Validate CORS isn't wildcard
  if (process.env.CORS_ORIGIN === '*') {
    throw new Error('FATAL: CORS_ORIGIN=* is not allowed. Set explicit origins.');
  }
}

async function bootstrap() {
  validateEnvironment();
  const app = await NestFactory.create(AppModule);
  // ...
}
```

### Verification

```bash
# Remove a required var and start
unset DATABASE_URL
cd packages/backend && npm run dev
# Expected: FATAL: Missing required environment variables: DATABASE_URL
```

---

## Phase 2 Checklist

| # | Issue | File(s) | Fix | Done |
|---|-------|---------|-----|------|
| 2.1 | localStorage token | `auth.store.ts`, 7+ files | httpOnly cookies or centralize | [ ] |
| 2.2 | Employee PIN/MFA exposed | `prisma-employee.repository.ts` | Exclude from API responses | [ ] |
| 2.3 | Google OAuth no sig verify | `auth.service.ts:75-119` | Use google-auth-library | [ ] |
| 2.4 | Missing Nginx headers | `nginx.conf` | Add CSP, X-Frame-Options, etc. | [ ] |
| 2.5 | Source maps in production | `vite.config.ts:80` | Disable or use 'hidden' | [ ] |
| 2.6 | No env var validation | `main.ts` | Validate at startup | [ ] |

**After completing Phase 2:** Application should have significantly reduced attack surface. Proceed to Phase 3 for architecture-level improvements.
