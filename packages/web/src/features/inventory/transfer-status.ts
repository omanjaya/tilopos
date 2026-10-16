import type { StockTransferStatus } from '@/api/endpoints/inventory.api';
import { can } from '@/config/permissions';

type BadgeVariant = 'info' | 'warning' | 'secondary' | 'success' | 'destructive';

/** Labels for the backend StockTransferStatus enum. */
export const TRANSFER_STATUS_CONFIG: Record<StockTransferStatus, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'Diminta', variant: 'info' },
  approved: { label: 'Disetujui', variant: 'warning' },
  in_transit: { label: 'Dalam Pengiriman', variant: 'secondary' },
  received: { label: 'Diterima', variant: 'success' },
  rejected: { label: 'Ditolak', variant: 'destructive' },
  cancelled: { label: 'Dibatalkan', variant: 'destructive' },
};

export function transferStatusConfig(status: string): { label: string; variant: BadgeVariant } {
  return (
    TRANSFER_STATUS_CONFIG[status as StockTransferStatus] ?? { label: status, variant: 'secondary' }
  );
}

/**
 * Mirrors backend @Roles on /stock-transfers and /transfer-templates:
 * approve + template delete = MANAGER/OWNER; ship/direct/template create = MANAGER/OWNER/INVENTORY;
 * request (POST) and receive = MANAGER/OWNER/SUPERVISOR/INVENTORY.
 */
export function transferPermissions(role: string | undefined) {
  return {
    canApprove: can(role, 'transfers.approve'),
    canManage: can(role, 'transfers.ship'),
    canReceive: can(role, 'transfers.receive'),
  };
}
