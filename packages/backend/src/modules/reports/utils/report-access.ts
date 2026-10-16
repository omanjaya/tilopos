import { ROLE_HIERARCHY } from '../../../shared/constants/roles';

/**
 * Cost price, gross profit and cash variance are management data (R12):
 * only manager and above may see them. Supervisors get the sales figures with
 * the cost-derived fields set to null.
 */
export function canViewCostData(role: string): boolean {
  return (ROLE_HIERARCHY[role] || 0) >= (ROLE_HIERARCHY.manager ?? 5);
}
