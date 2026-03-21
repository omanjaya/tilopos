import { SetMetadata } from '@nestjs/common';
import { EmployeeRole } from '../../shared/constants/roles';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: (EmployeeRole | string)[]) => SetMetadata(ROLES_KEY, roles);
