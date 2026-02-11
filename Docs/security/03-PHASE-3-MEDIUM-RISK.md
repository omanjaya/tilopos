# Phase 3 — Medium Risk & Architecture Improvements

**Priority:** Fix within 1-2 sprints (after Phase 1 & 2 complete)
**Estimated Effort:** 1-2 weeks total
**Prerequisite:** Phase 1 and Phase 2 must be resolved first

---

## Issue 3.1 — No CSRF Protection

**Severity:** MEDIUM
**Files:** Frontend-wide, `packages/backend/src/main.ts`
**Impact:** Cross-site request forgery attacks possible on state-changing endpoints

### Problem

No CSRF tokens are generated or validated. POST/PUT/DELETE requests can be triggered from malicious websites if the user is authenticated.

Current mitigations (partial):
- JWT in Authorization header (not auto-sent by browser) — mitigates if using Bearer token
- CORS configured (but was `*`, fixed in Phase 1)

Note: If Phase 2 Issue 2.1 moves tokens to httpOnly cookies, CSRF protection becomes **mandatory** since cookies are auto-sent by browsers.

### Fix

**If using httpOnly cookies (Phase 2 Option A):**

Backend — add csurf middleware:
```bash
cd packages/backend && npm install csurf cookie-parser
```

```typescript
// main.ts
import cookieParser from 'cookie-parser';
import csurf from 'csurf';

app.use(cookieParser());
app.use(csurf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
}));
```

Frontend — attach CSRF token to requests:
```typescript
// api/client.ts
apiClient.interceptors.request.use((config) => {
  const csrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('XSRF-TOKEN='))
    ?.split('=')[1];
  if (csrfToken) {
    config.headers['X-XSRF-TOKEN'] = csrfToken;
  }
  return config;
});
```

**If keeping Bearer token in memory (Phase 2 Option B):**

CSRF protection is less critical since the Authorization header is not auto-sent. Still recommended to add `SameSite=Strict` on any cookies.

---

## Issue 3.2 — User Enumeration via Login Timing

**Severity:** MEDIUM
**File:** `packages/backend/src/application/use-cases/auth/login.use-case.ts:36-48`
**Impact:** Attackers can discover valid email addresses

### Problem

```typescript
// login.use-case.ts
const employee = await this.employeeRepo.findByEmail(input.email);
if (!employee || !employee.isActive) {
  throw new UnauthorizedException('Invalid credentials');
}
// bcrypt.compare only runs if employee exists — timing difference
const isValid = await bcrypt.compare(input.pin, employee.pin);
```

If email doesn't exist, response is fast (no bcrypt). If email exists but PIN is wrong, response is slow (bcrypt runs). This timing difference reveals which emails are valid.

### Fix

```typescript
async execute(input: LoginInput): Promise<LoginOutput> {
  const employee = await this.employeeRepo.findByEmail(input.email);

  // Always run bcrypt to prevent timing attacks
  const dummyHash = '$2b$10$dummyHashForTimingAttackPrevention000000000000000';
  const pinToCheck = employee?.pin || dummyHash;
  const isValid = await bcrypt.compare(input.pin, pinToCheck);

  if (!employee || !employee.isActive || !isValid) {
    throw new UnauthorizedException('Invalid credentials');
  }

  // ... proceed with token generation
}
```

---

## Issue 3.3 — Database/Redis/RabbitMQ Ports Exposed

**Severity:** MEDIUM
**Files:** `docker-compose.dev.yml`, `docker-compose.yml`
**Impact:** Internal services accessible from network

### Problem

```yaml
# docker-compose.dev.yml
postgres:
  ports:
    - "5432:5432"      # Database exposed
redis:
  ports:
    - "6379:6379"      # Redis exposed (no auth)
rabbitmq:
  ports:
    - "15672:15672"    # RabbitMQ management UI exposed
backend:
  ports:
    - "9229:9229"      # Node.js debug port exposed
```

### Fix

**Development:** Bind to localhost only:
```yaml
postgres:
  ports:
    - "127.0.0.1:5432:5432"
redis:
  ports:
    - "127.0.0.1:6379:6379"
rabbitmq:
  ports:
    - "127.0.0.1:15672:15672"
```

**Production:** Remove all internal service ports — only expose frontend (80/443) and backend (3001):
```yaml
# docker-compose.yml (production)
postgres:
  # NO ports section — accessible only via Docker network
  expose:
    - "5432"
redis:
  expose:
    - "6379"
rabbitmq:
  expose:
    - "5672"
```

Remove debug port from production:
```yaml
backend:
  ports:
    - "3001:3001"
    # NO 9229 debug port
```

---

## Issue 3.4 — Request Logging May Leak Sensitive Data

**Severity:** MEDIUM
**File:** `packages/backend/src/infrastructure/logging/request-logger.middleware.ts:19-21`
**Impact:** Sensitive query parameters may appear in logs

### Problem

```typescript
this.logger[logLevel](
  `${method} ${originalUrl} ${statusCode} ${contentLength}B ${duration}ms - ${ip}`,
);
```

`originalUrl` includes query strings which may contain:
- `?token=...` (reset password tokens)
- `?code=...` (OAuth codes)
- `?search=...` (PII in search queries)

### Fix

```typescript
// Sanitize URL before logging
private sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url, 'http://localhost');
    const sensitiveParams = ['token', 'code', 'secret', 'password', 'key'];
    sensitiveParams.forEach(param => {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, '[REDACTED]');
      }
    });
    return parsed.pathname + parsed.search;
  } catch {
    return url.split('?')[0]; // Fallback: strip all query params
  }
}

// In the logging call
this.logger[logLevel](
  `${method} ${this.sanitizeUrl(originalUrl)} ${statusCode} ${contentLength}B ${duration}ms - ${ip}`,
);
```

---

## Issue 3.5 — Cart Tax Rates Hardcoded

**Severity:** MEDIUM
**File:** `packages/web/src/stores/cart.store.ts:73-74`
**Impact:** Tax calculation incorrect if business has different rates

### Problem

```typescript
// cart.store.ts
const TAX_RATE = 0.11;            // 11% PPN — hardcoded
const SERVICE_CHARGE_RATE = 0.05; // 5% — hardcoded
```

Indonesian tax rates can vary by business type. Service charges are configurable per outlet. These should come from backend settings.

### Fix

```typescript
// Step 1: Add to outlet settings API response
// Backend: include tax_rate and service_charge_rate in outlet/settings endpoint

// Step 2: Store in UIStore or load dynamically
interface UIState {
  // ... existing
  taxRate: number;
  serviceChargeRate: number;
}

// Step 3: CartStore reads from UIStore
recalculate: () => {
  const { taxRate, serviceChargeRate } = useUIStore.getState();
  // ... use dynamic rates
},
```

---

## Issue 3.6 — Console.error Statements in Production API Code

**Severity:** MEDIUM
**Files:**
- `packages/web/src/api/endpoints/reports.api.ts:68,86`
- `packages/web/src/api/endpoints/shifts.api.ts:24,44`
- `packages/web/src/api/endpoints/item-tracking.api.ts` (multiple)
**Impact:** Error details visible in browser DevTools

### Problem

```typescript
// reports.api.ts
} catch (error) {
  console.error('Failed to fetch product report:', error);
  throw error;
}
```

Error objects can contain response data, request configs (including headers with auth tokens), and stack traces.

### Fix

**Option A: Remove catch blocks** (let error bubble to TanStack Query error handling):
```typescript
// Just throw — TanStack Query handles errors
export async function fetchProductReport(params: ReportParams) {
  const { data } = await apiClient.get('/reports/products', { params });
  return data;
}
```

**Option B: Strip sensitive data from logged errors:**
```typescript
} catch (error) {
  if (process.env.NODE_ENV !== 'production') {
    console.error('Failed to fetch product report:', error);
  }
  throw error;
}
```

**Option C: Use Vite define to strip in build:**
```typescript
// vite.config.ts
define: {
  'import.meta.env.PROD': JSON.stringify(process.env.NODE_ENV === 'production'),
},
// Then in code, tree-shaking removes the block in production
if (import.meta.env.DEV) {
  console.error('Failed:', error);
}
```

---

## Issue 3.7 — Offline Transaction Data Unencrypted

**Severity:** MEDIUM
**File:** `packages/web/src/hooks/use-offline-pos.ts`
**Impact:** Transaction data accessible if device is compromised

### Problem

Offline POS stores complete transaction objects in IndexedDB (with localStorage fallback):
- Employee IDs, shift IDs
- Cart items with prices
- Payment details
- Customer information

All stored in plaintext, accessible via browser DevTools.

### Fix

**Option A: Encrypt with Web Crypto API**
```typescript
// lib/crypto.ts
const ENCRYPTION_KEY = 'derived-from-user-pin-or-session';

async function encrypt(data: string): Promise<string> {
  const key = await deriveKey(ENCRYPTION_KEY);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(data);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  );
  return btoa(String.fromCharCode(...iv, ...new Uint8Array(encrypted)));
}

async function decrypt(ciphertext: string): Promise<string> {
  const raw = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const iv = raw.slice(0, 12);
  const data = raw.slice(12);
  const key = await deriveKey(ENCRYPTION_KEY);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data,
  );
  return new TextDecoder().decode(decrypted);
}
```

**Option B: Clear offline data on logout** (simpler):
```typescript
// auth.store.ts logout
logout: () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  // Clear offline transaction queue
  indexedDB.deleteDatabase('tilopos-offline');
  localStorage.removeItem('offline-transactions');
  set({ user: null, token: null, isAuthenticated: false });
},
```

---

## Phase 3 Checklist

| # | Issue | Effort | Done |
|---|-------|--------|------|
| 3.1 | CSRF protection | 1 day | [ ] |
| 3.2 | User enumeration timing | 30 min | [ ] |
| 3.3 | Internal ports exposed | 30 min | [ ] |
| 3.4 | Request log sanitization | 1 hour | [ ] |
| 3.5 | Cart tax rates from settings | 2 hours | [ ] |
| 3.6 | Console.error in production | 1 hour | [ ] |
| 3.7 | Offline data encryption | 1 day | [ ] |

**After completing Phase 3:** The application should score 8.5/10 on security assessment. Schedule regular quarterly audits to maintain this level.
