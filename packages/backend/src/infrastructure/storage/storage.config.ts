import { ConfigService } from '@nestjs/config';

export type StorageDriver = 's3' | 'local';

export interface S3Settings {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
}

/** Reads the first non-empty value among `keys` (k8s manifests use the short S3_* names). */
function first(config: ConfigService, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = config.get<string>(key);
    if (value && value.trim() !== '') return value.trim();
  }
  return undefined;
}

/**
 * Selects the storage driver (R16). STORAGE_DRIVER=s3|local picks explicitly. Without it,
 * development keeps the old behaviour (S3 when access keys exist, else local disk), but
 * production refuses to boot: silently writing uploads to a pod's local disk loses them.
 */
export function resolveStorageDriver(config: ConfigService): StorageDriver {
  const explicit = config.get<string>('STORAGE_DRIVER');
  if (explicit) {
    if (explicit !== 's3' && explicit !== 'local') {
      throw new Error(`STORAGE_DRIVER must be "s3" or "local", got "${explicit}"`);
    }
    return explicit;
  }
  if (config.get<string>('NODE_ENV') === 'production') {
    throw new Error('STORAGE_DRIVER is required in production (s3 or local)');
  }
  return first(config, 'S3_ACCESS_KEY_ID', 'S3_ACCESS_KEY') ? 's3' : 'local';
}

/** S3 settings; throws when any required value is missing (no silent defaults). */
export function resolveS3Settings(config: ConfigService): S3Settings {
  const settings = {
    bucket: first(config, 'S3_BUCKET'),
    region: first(config, 'S3_REGION'),
    accessKeyId: first(config, 'S3_ACCESS_KEY_ID', 'S3_ACCESS_KEY'),
    secretAccessKey: first(config, 'S3_SECRET_ACCESS_KEY', 'S3_SECRET_KEY'),
    endpoint: first(config, 'S3_ENDPOINT'),
  };
  const missing = (['bucket', 'region', 'accessKeyId', 'secretAccessKey'] as const).filter(
    (key) => !settings[key],
  );
  if (missing.length > 0) {
    throw new Error(`S3 storage selected but not configured: missing ${missing.join(', ')}`);
  }
  return settings as S3Settings;
}
