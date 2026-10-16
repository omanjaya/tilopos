import { SetMetadata } from '@nestjs/common';
import { EmployeeRole } from '../../shared/constants/roles';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: (EmployeeRole | string)[]) => SetMetadata(ROLES_KEY, roles);

export const ANY_ROLE_KEY = 'anyRole';

/**
 * Explicitly allows every authenticated employee (any role) to call a mutating
 * route — e.g. own profile, own PIN, marking own notifications read.
 * Use instead of omitting @Roles(), which route-policy.spec.ts rejects.
 */
export const AllowAnyRole = () => SetMetadata(ANY_ROLE_KEY, true);
