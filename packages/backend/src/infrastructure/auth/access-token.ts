import { UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
import type { AuthUser } from './auth-user.interface';

/** Claims carried by a normal access token. */
export interface AccessTokenPayload {
  exp?: number;
  sid?: string;
  typ?: 'access';
  sub: string;
  businessId: string;
  outletId: string | null;
  role: string;
  emailVerified?: boolean;
  /** Present only on special-purpose tokens (MFA, email verification) — never accepted as access. */
  purpose?: string;
}

/**
 * Validates the claims of a decoded access token and maps them to AuthUser.
 * Rejects special-purpose tokens and tokens without tenant context, so that
 * a query can never run with businessId === undefined.
 */
export function toAuthUser(payload: AccessTokenPayload | null | undefined): AuthUser {
  if (!payload || payload.purpose) {
    throw new UnauthorizedException('Invalid access token');
  }
  if (!payload.sub || !payload.businessId || !payload.role) {
    throw new UnauthorizedException('Invalid access token');
  }
  return {
    employeeId: payload.sub,
    businessId: payload.businessId,
    outletId: payload.outletId ?? null,
    role: payload.role,
    emailVerified: payload.emailVerified ?? false,
  };
}

export type TokenPurpose = 'mfa_verification' | 'email_verification';

/**
 * Derives a separate signing secret per token purpose, so a purpose token
 * can never verify as an access token (and vice versa).
 */
export function purposeSecret(jwtSecret: string, purpose: TokenPurpose): string {
  return createHmac('sha256', jwtSecret).update(`tilopos:${purpose}`).digest('hex');
}
