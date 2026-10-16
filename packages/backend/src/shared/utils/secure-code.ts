import { randomBytes, randomInt } from 'crypto';

/**
 * Unguessable identifiers (Docs/ENGINEERING-RULES.md R15).
 * Never use Math.random() for anything a customer can see or guess.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

/** Human-friendly random code, e.g. self-order session codes. */
export function secureCode(length = 10): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}

/** URL-safe opaque token. */
export function secureToken(bytes = 24): string {
  return randomBytes(bytes).toString('base64url');
}

/** Random integer in [min, max) from a CSPRNG. */
export function secureInt(min: number, max: number): number {
  return randomInt(min, max);
}
