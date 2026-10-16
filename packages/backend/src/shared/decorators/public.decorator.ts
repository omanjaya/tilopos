import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route (or controller) as reachable without a JWT.
 * Authentication is global (see app.module.ts), so every unauthenticated
 * route must opt out explicitly. Public routes are listed in
 * test/unit/route-policy.spec.ts — adding one requires updating that list.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
