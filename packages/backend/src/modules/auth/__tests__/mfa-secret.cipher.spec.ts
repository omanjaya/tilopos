import { ConfigService } from '@nestjs/config';
import { MfaSecretCipher } from '../mfa/mfa-secret.cipher';

const makeCipher = (env: Record<string, string | undefined>) =>
  new MfaSecretCipher({
    get: (k: string) => env[k],
    getOrThrow: (k: string) => {
      if (!env[k]) throw new Error(`missing ${k}`);
      return env[k];
    },
  } as unknown as ConfigService);

describe('MfaSecretCipher', () => {
  const cipher = makeCipher({ JWT_SECRET: 'j'.repeat(40) });

  it('round-trips and never stores the plaintext', () => {
    const stored = cipher.encrypt('JBSWY3DPEHPK3PXP');
    expect(stored.startsWith('enc:v1:')).toBe(true);
    expect(stored).not.toContain('JBSWY3DPEHPK3PXP');
    expect(cipher.decrypt(stored)).toBe('JBSWY3DPEHPK3PXP');
  });

  it('uses a random IV per encryption', () => {
    expect(cipher.encrypt('A')).not.toBe(cipher.encrypt('A'));
  });

  it('reads legacy plaintext seeds', () => {
    expect(cipher.decrypt('JBSWY3DPEHPK3PXP')).toBe('JBSWY3DPEHPK3PXP');
  });

  it('rejects tampered ciphertext and a different key', () => {
    const stored = cipher.encrypt('JBSWY3DPEHPK3PXP');
    const other = makeCipher({ JWT_SECRET: 'j'.repeat(40), MFA_ENCRYPTION_KEY: 'k'.repeat(40) });
    expect(() => other.decrypt(stored)).toThrow();
    const tampered = stored.slice(0, -4) + (stored.endsWith('AAAA') ? 'BBBB' : 'AAAA');
    expect(() => cipher.decrypt(tampered)).toThrow();
  });
});
