import { parseTrustProxy, validateEnv } from './env.validation';

const base = {
  DATABASE_URL: 'postgresql://x',
  JWT_SECRET: 'a'.repeat(40),
  JWT_EXPIRES_IN: '1h',
};

describe('validateEnv', () => {
  it('accepts a minimal development config', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'development' })).not.toThrow();
  });

  it('requires core variables', () => {
    expect(() => validateEnv({ NODE_ENV: 'development' })).toThrow(/DATABASE_URL/);
  });

  it('refuses the mock gateway and weak secrets in production', () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'production',
        JWT_SECRET: 'your-jwt-secret-change-this',
        PAYMENT_GATEWAY: 'mock',
        CORS_ORIGIN: 'https://app.example',
        FRONTEND_URL: 'https://app.example',
        REDIS_HOST: 'redis',
      }),
    ).toThrow(/JWT_SECRET[\s\S]*PAYMENT_GATEWAY=mock/);
  });

  it('requires gateway keys in production', () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'production',
        PAYMENT_GATEWAY: 'xendit',
        CORS_ORIGIN: 'https://app.example',
        FRONTEND_URL: 'https://app.example',
        REDIS_HOST: 'redis',
      }),
    ).toThrow(/XENDIT_API_KEY/);
  });

  it('bounds and validates JWT_EXPIRES_IN', () => {
    expect(() => validateEnv({ ...base, JWT_EXPIRES_IN: '7d' })).not.toThrow();
    expect(() => validateEnv({ ...base, JWT_EXPIRES_IN: '30d' })).toThrow(/must not exceed 7d/);
    expect(() => validateEnv({ ...base, JWT_EXPIRES_IN: 'forever' })).toThrow(/JWT_EXPIRES_IN/);
  });

  it('validates refresh lifetime without changing access-token policy', () => {
    expect(() => validateEnv({ ...base, REFRESH_TOKEN_EXPIRES_IN: '30d' })).not.toThrow();
    for (const duration of ['0', 'forever', '31d']) {
      expect(() => validateEnv({ ...base, REFRESH_TOKEN_EXPIRES_IN: duration })).toThrow(
        /REFRESH_TOKEN_EXPIRES_IN/,
      );
    }
  });

  it('accepts explicit CORS origins and rejects wildcard or URL paths', () => {
    expect(() =>
      validateEnv({ ...base, CORS_ORIGIN: 'https://pos.example.com, https://admin.example.com' }),
    ).not.toThrow();
    for (const origin of [
      '*',
      'https://pos.example.com,*',
      'null',
      'https://pos.example.com/path',
    ]) {
      expect(() => validateEnv({ ...base, CORS_ORIGIN: origin })).toThrow(/CORS_ORIGIN/);
    }
  });

  it('validates TRUST_PROXY and MFA_ENCRYPTION_KEY', () => {
    expect(() => validateEnv({ ...base, TRUST_PROXY: '1' })).not.toThrow();
    expect(() => validateEnv({ ...base, TRUST_PROXY: 'loopback, 10.0.0.0/8' })).not.toThrow();
    expect(() => validateEnv({ ...base, TRUST_PROXY: 'not a proxy!' })).toThrow(/TRUST_PROXY/);
    expect(() => validateEnv({ ...base, MFA_ENCRYPTION_KEY: 'short' })).toThrow(
      /MFA_ENCRYPTION_KEY/,
    );
  });
});

describe('parseTrustProxy', () => {
  it('maps the supported forms', () => {
    expect(parseTrustProxy(undefined)).toBe(false);
    expect(parseTrustProxy('false')).toBe(false);
    expect(parseTrustProxy('true')).toBe(true);
    expect(parseTrustProxy('2')).toBe(2);
    expect(parseTrustProxy('loopback,172.16.0.0/12')).toEqual(['loopback', '172.16.0.0/12']);
  });

  it('requires optional channels to be configured consistently', () => {
    expect(() => validateEnv({ ...base, SMTP_HOST: 'smtp.x' })).toThrow(/SMTP_FROM/);
    expect(() =>
      validateEnv({ ...base, SMTP_HOST: 'smtp.x', SMTP_FROM: 'a@b.c', SMTP_USER: 'u' }),
    ).toThrow(/SMTP_PASS/);
    expect(() =>
      validateEnv({
        ...base,
        SMTP_HOST: 'smtp.x',
        SMTP_FROM: 'a@b.c',
        SMTP_USER: 'u',
        SMTP_PASSWORD: 'p',
      }),
    ).not.toThrow();
    expect(() => validateEnv({ ...base, WHATSAPP_API_TOKEN: 't' })).toThrow(/WHATSAPP_API_URL/);
    expect(() => validateEnv({ ...base, TWILIO_ACCOUNT_SID: 'AC1' })).toThrow(
      /TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER/,
    );
  });

  it('validates storage and metrics settings', () => {
    expect(() => validateEnv({ ...base, STORAGE_DRIVER: 'ftp' })).toThrow(/STORAGE_DRIVER/);
    expect(() => validateEnv({ ...base, STORAGE_DRIVER: 's3', S3_BUCKET: 'b' })).toThrow(
      /S3_REGION[\s\S]*S3_ACCESS_KEY_ID[\s\S]*S3_SECRET_ACCESS_KEY/,
    );
    expect(() =>
      validateEnv({
        ...base,
        STORAGE_DRIVER: 's3',
        S3_BUCKET: 'b',
        S3_REGION: 'r',
        S3_ACCESS_KEY: 'k',
        S3_SECRET_KEY: 's',
      }),
    ).not.toThrow();
    expect(() => validateEnv({ ...base, METRICS_ENABLED: 'yes' })).toThrow(/METRICS_ENABLED/);
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'production',
        CORS_ORIGIN: 'https://app.example',
        FRONTEND_URL: 'https://app.example',
        REDIS_HOST: 'redis',
        XENDIT_API_KEY: 'k',
        XENDIT_WEBHOOK_TOKEN: 't',
      }),
    ).toThrow(/STORAGE_DRIVER is required/);
  });
});
