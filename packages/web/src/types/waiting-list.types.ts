export type WaitingListStatus = 'waiting' | 'seated' | 'cancelled' | 'no_show';

export interface WaitingListEntry {
  id: string;
  businessId: string;
  outletId: string;
  customerName: string;
  phoneNumber: string;
  partySize: number;
  status: WaitingListStatus;
  specialRequests: string | null;
  tableId: string | null;
  tableName: string | null;
  notifiedAt: string | null;
  seatedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WaitingListStats {
  totalWaiting: number;
  averageWaitTime: number; // in minutes
  longestWaitTime: number; // in minutes
}

export interface AddWaitingListRequest {
  customerName: string;
  phoneNumber: string;
  partySize: number;
  specialRequests?: string;
}

export interface UpdateWaitingListRequest {
  customerName?: string;
  phoneNumber?: string;
  partySize?: number;
  specialRequests?: string;
}

export interface SeatCustomerRequest {
  tableId: string;
}
