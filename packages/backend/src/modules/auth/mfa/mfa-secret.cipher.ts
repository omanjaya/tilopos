import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto';

const PREFIX = 'enc:v1:';
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts TOTP seeds at rest (AES-256-GCM), so a database or backup leak
 * does not defeat MFA.
 *
 * Key: MFA_ENCRYPTION_KEY when set (recommended; keep it stable), otherwise a
 * key derived from JWT_SECRET. Rotating the key source invalidates stored
 * seeds, so affected users must re-enrol.
 * Legacy plaintext seeds (no prefix) are still readable and get encrypted
 * the next time the secret is written.
 */
@Injectable()
export class MfaSecretCipher {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const explicit = config.get<string>('MFA_ENCRYPTION_KEY');
    const base = explicit || config.getOrThrow<string>('JWT_SECRET');
    this.key = createHmac('sha256', base).update('tilopos:mfa-secret').digest();
  }

  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
  }

  decrypt(stored: string): string {
    if (!stored.startsWith(PREFIX)) {
      return stored; // legacy plaintext seed
    }
    const [ivB64, tagB64, dataB64] = stored.slice(PREFIX.length).split(':');
    if (!ivB64 || !tagB64 || !dataB64) {
      throw new Error('Malformed encrypted MFA secret');
    }
    const decipher = createDecipheriv(ALGORITHM, this.key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }
}
