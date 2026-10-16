export type WaitingListStatus = 'waiting' | 'notified' | 'seated' | 'cancelled' | 'no_show';

/**
 * Normalised waiting-list entry used by the UI. The backend returns raw Prisma
 * rows ({ customerPhone, notes, queuedAt, table: { name } }); waitingListApi maps
 * them to this shape.
 */
export interface WaitingListEntry {
  id: string;
  outletId: string;
  customerName: string;
  phoneNumber: string | null;
  partySize: number;
  status: WaitingListStatus;
  specialRequests: string | null;
  tableId: string | null;
  tableName: string | null;
  queuedAt: string;
  notifiedAt: string | null;
  seatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** GET /waiting-list/stats (waiting-list.service.ts getStats). */
export interface WaitingListStats {
  waiting: number;
  notified: number;
  seatedToday: number;
  cancelledToday: number;
  noShowToday: number;
  /** Average wait of today's seated customers, in minutes. */
  avgWaitTime: number;
  /** Rough estimate for a new party, in minutes. */
  estimatedWait: number;
}

/** POST /waiting-list body (backend field names). */
export interface AddWaitingListRequest {
  outletId: string;
  customerName: string;
  customerPhone?: string;
  partySize: number;
  notes?: string;
}

export interface SeatCustomerRequest {
  tableId: string;
}
