export interface SettlementRecord {
  id: string;
  outletId: string;
  paymentMethod: string;
  settlementDate: Date;
  totalTransactions: number;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  status: string;
  referenceNumber: string | null;
  settledAt: Date | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISettlementRepository {
  findByOutletId(outletId: string): Promise<SettlementRecord[]>;
  create(data: {
    outletId: string;
    paymentMethod: string;
    settlementDate: Date;
    totalTransactions: number;
    grossAmount: number;
    feeAmount: number;
    netAmount: number;
    referenceNumber: string | null;
  }): Promise<SettlementRecord>;
  settle(id: string): Promise<SettlementRecord>;
  dispute(id: string): Promise<SettlementRecord>;
}
