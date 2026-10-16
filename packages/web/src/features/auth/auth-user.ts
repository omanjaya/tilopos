import type { AuthUser, MeResponse } from '@/types/auth.types';

/** Map GET /auth/me to the user object kept in the auth store. */
export function meToAuthUser(me: MeResponse, previous?: AuthUser | null): AuthUser {
  return {
    ...(previous ?? {}),
    id: me.id,
    employeeId: me.id,
    name: me.name,
    email: me.email,
    phone: me.phone,
    role: me.role,
    businessId: me.businessId,
    outletId: me.outletId,
    outletName: me.outletName ?? undefined,
    profilePhotoUrl: me.profilePhotoUrl,
    onboardingCompleted: me.onboardingCompleted,
    emailVerified: me.emailVerified,
    preferences: me.preferences,
    createdAt: me.createdAt,
  };
}
