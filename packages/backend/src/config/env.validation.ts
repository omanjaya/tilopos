/**
 * Environment validation (Docs/ENGINEERING-RULES.md R16).
 * Runs once at boot via ConfigModule.forRoot({ validate }).
 * Production refuses to start with missing/unsafe configuration instead of
 * silently falling back to localhost, sandbox or mock providers.
 */
type Env = Record<string, string | undefined>;

const PLACEHOLDER_SECRETS = new Set(['your-jwt-secret-change-this', 'changeme', 'secret']);

export function validateEnv(raw: Record<string, unknown>): Env {
  const env = raw as Env;
  const errors: string[] = [];
  const isProd = env.NODE_ENV === 'production';

  const require = (key: string, why?: string) => {
    if (!env[key] || env[key]!.trim() === '') {
      errors.push(`${key} is required${why ? ` (${why})` : ''}`);
    }
  };

  require('DATABASE_URL');
  require('JWT_SECRET');
  require('JWT_EXPIRES_IN');

  const secret = env.JWT_SECRET ?? '';
  if (secret && (secret.length < 32 || PLACEHOLDER_SECRETS.has(secret))) {
    const msg = 'JWT_SECRET must be at least 32 characters and not a placeholder';
    if (isProd) errors.push(msg);
    else console.warn(`WARNING: ${msg}`);
  }

  const expiresIn = env.JWT_EXPIRES_IN;
  if (expiresIn) {
    const seconds = durationToSeconds(expiresIn);
    if (seconds === null) {
      errors.push('JWT_EXPIRES_IN must look like 3600, 30m, 12h or 7d');
    } else if (seconds > MAX_ACCESS_TOKEN_SECONDS) {
      errors.push('JWT_EXPIRES_IN must not exceed 7d');
    }
  }

  const refreshSeconds = durationToSeconds(env.REFRESH_TOKEN_EXPIRES_IN ?? '7d');
  if (refreshSeconds === null || refreshSeconds <= 0 || refreshSeconds > 30 * 86400) {
    errors.push('REFRESH_TOKEN_EXPIRES_IN must be positive and at most 30d');
  }

  if (env.TRUST_PROXY !== undefined && env.TRUST_PROXY.trim() !== '') {
    try {
      parseTrustProxy(env.TRUST_PROXY);
    } catch (error) {
      errors.push((error as Error).message);
    }
  }

  if (env.MFA_ENCRYPTION_KEY !== undefined && env.MFA_ENCRYPTION_KEY.length < 32) {
    errors.push('MFA_ENCRYPTION_KEY must be at least 32 characters');
  }

  const has = (key: string) => !!env[key] && env[key]!.trim() !== '';
  const firstOf = (...keys: string[]) => keys.some(has);

  // Optional channels: all-or-nothing so a half-configured provider fails at boot, not at send time.
  if (has('SMTP_HOST')) {
    if (!has('SMTP_FROM')) errors.push('SMTP_FROM is required when SMTP_HOST is set');
    if (has('SMTP_USER') && !firstOf('SMTP_PASS', 'SMTP_PASSWORD')) {
      errors.push('SMTP_PASS (or SMTP_PASSWORD) is required when SMTP_USER is set');
    }
  }
  if (has('SMTP_PORT') && !/^\d{1,5}$/.test(env.SMTP_PORT!.trim())) {
    errors.push('SMTP_PORT must be a port number');
  }
  if (has('WHATSAPP_API_TOKEN') && !has('WHATSAPP_API_URL')) {
    errors.push('WHATSAPP_API_URL is required when WHATSAPP_API_TOKEN is set');
  }
  const twilio = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER'];
  const twilioSet = twilio.filter(has);
  if (twilioSet.length > 0 && twilioSet.length < twilio.length) {
    errors.push(
      `${twilio.join(', ')} must be set together (missing: ${twilio.filter((k) => !has(k)).join(', ')})`,
    );
  }

  // Object storage (StorageModule enforces the same at boot; reported here with the other errors).
  const storageDriver = env.STORAGE_DRIVER?.trim();
  if (storageDriver && storageDriver !== 's3' && storageDriver !== 'local') {
    errors.push(`STORAGE_DRIVER must be "s3" or "local", got "${storageDriver}"`);
  }
  if (storageDriver === 's3') {
    if (!has('S3_BUCKET')) errors.push('S3_BUCKET is required when STORAGE_DRIVER=s3');
    if (!has('S3_REGION')) errors.push('S3_REGION is required when STORAGE_DRIVER=s3');
    if (!firstOf('S3_ACCESS_KEY_ID', 'S3_ACCESS_KEY')) {
      errors.push('S3_ACCESS_KEY_ID (or S3_ACCESS_KEY) is required when STORAGE_DRIVER=s3');
    }
    if (!firstOf('S3_SECRET_ACCESS_KEY', 'S3_SECRET_KEY')) {
      errors.push('S3_SECRET_ACCESS_KEY (or S3_SECRET_KEY) is required when STORAGE_DRIVER=s3');
    }
  }

  for (const key of ['METRICS_ENABLED', 'ENABLE_METRICS']) {
    if (has(key) && !['true', 'false'].includes(env[key]!.trim())) {
      errors.push(`${key} must be "true" or "false"`);
    }
  }
  if (has('METRICS_TOKEN') && env.METRICS_TOKEN!.trim().length < 16) {
    errors.push('METRICS_TOKEN must be at least 16 characters');
  }

  if (env.CORS_ORIGIN) {
    for (const origin of env.CORS_ORIGIN.split(',').map((value) => value.trim())) {
      try {
        const parsed = new URL(origin);
        if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin)
          throw new Error('origin');
      } catch {
        errors.push('CORS_ORIGIN must contain explicit HTTP(S) origins without paths or wildcards');
      }
    }
  }

  if (isProd) {
    require('CORS_ORIGIN', 'no localhost fallback in production');
    require('FRONTEND_URL', 'used in e-mail links');
    require('REDIS_HOST', 'locks, queues and cache');
    require('STORAGE_DRIVER', 's3 or local; uploads must not silently land on pod-local disk');

    const gateway = env.PAYMENT_GATEWAY ?? 'xendit';
    if (gateway === 'mock') {
      errors.push('PAYMENT_GATEWAY=mock is not allowed in production');
    } else if (gateway === 'midtrans') {
      require('MIDTRANS_SERVER_KEY', 'PAYMENT_GATEWAY=midtrans');
      if (env.MIDTRANS_ENV !== 'production') {
        errors.push('MIDTRANS_ENV must be "production" when NODE_ENV=production');
      }
    } else if (gateway === 'xendit') {
      require('XENDIT_API_KEY', 'PAYMENT_GATEWAY=xendit');
      require('XENDIT_WEBHOOK_TOKEN', 'Xendit callbacks are verified with it');
    } else {
      errors.push(`Unknown PAYMENT_GATEWAY "${gateway}"`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n${errors.map((e) => `  - ${e}`).join('\n')}`,
    );
  }
  return env;
}

const MAX_ACCESS_TOKEN_SECONDS = 7 * 24 * 60 * 60;

/** Parses a jsonwebtoken-style duration ("3600", "30m", "12h", "7d"). */
export function durationToSeconds(value: string): number | null {
  const match = /^(\d+)\s*([smhd]?)$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const amount = Number(match[1]);
  const unit = match[2] || 's';
  const factor = { s: 1, m: 60, h: 3600, d: 86400 }[unit as 's' | 'm' | 'h' | 'd'];
  return amount * factor;
}

/**
 * Parses TRUST_PROXY for Express `app.set('trust proxy', ...)`:
 * - unset/empty/"false" → false (req.ip is the socket address)
 * - "true"              → true (trust every hop; only behind a proxy that overwrites X-Forwarded-For)
 * - "1", "2", …         → number of proxy hops in front of the app
 * - otherwise           → comma-separated addresses/subnets or presets (loopback, linklocal, uniquelocal)
 */
export function parseTrustProxy(value: string | undefined): boolean | number | string[] {
  const raw = (value ?? '').trim();
  if (raw === '' || raw === 'false') {
    return false;
  }
  if (raw === 'true') {
    return true;
  }
  if (/^\d+$/.test(raw)) {
    return Number(raw);
  }
  const parts = raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const valid = /^(loopback|linklocal|uniquelocal|[0-9a-fA-F:.]+(\/\d{1,3})?)$/;
  const bad = parts.filter((p) => !valid.test(p));
  if (parts.length === 0 || bad.length > 0) {
    throw new Error(`TRUST_PROXY has invalid entries: ${bad.join(', ') || raw}`);
  }
  return parts;
}
