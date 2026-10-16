import { ConfigService } from '@nestjs/config';
import { resolveS3Settings, resolveStorageDriver } from './storage.config';

const cfg = (env: Record<string, string>) => new ConfigService(env);

describe('storage config', () => {
  it('refuses to boot in production without an explicit STORAGE_DRIVER', () => {
    expect(() => resolveStorageDriver(cfg({ NODE_ENV: 'production' }))).toThrow(/STORAGE_DRIVER/);
    // even when keys exist under the k8s names — no silent guessing in production
    expect(() => resolveStorageDriver(cfg({ NODE_ENV: 'production', S3_ACCESS_KEY: 'x' }))).toThrow(
      /STORAGE_DRIVER/,
    );
  });

  it('honours an explicit driver and rejects unknown values', () => {
    expect(resolveStorageDriver(cfg({ NODE_ENV: 'production', STORAGE_DRIVER: 's3' }))).toBe('s3');
    expect(resolveStorageDriver(cfg({ STORAGE_DRIVER: 'local' }))).toBe('local');
    expect(() => resolveStorageDriver(cfg({ STORAGE_DRIVER: 'gcs' }))).toThrow();
  });

  it('keeps the dev fallback (keys => s3, otherwise local)', () => {
    expect(resolveStorageDriver(cfg({ S3_ACCESS_KEY_ID: 'k' }))).toBe('s3');
    expect(resolveStorageDriver(cfg({}))).toBe('local');
  });

  it('requires every S3 setting and accepts the k8s aliases', () => {
    expect(() => resolveS3Settings(cfg({ S3_BUCKET: 'b' }))).toThrow(/region, accessKeyId/);
    expect(
      resolveS3Settings(
        cfg({ S3_BUCKET: 'b', S3_REGION: 'r', S3_ACCESS_KEY: 'a', S3_SECRET_KEY: 's' }),
      ),
    ).toEqual({
      bucket: 'b',
      region: 'r',
      accessKeyId: 'a',
      secretAccessKey: 's',
      endpoint: undefined,
    });
  });
});
