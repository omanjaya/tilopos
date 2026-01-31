export interface ISettlementRepository {
  findByOutletId(outletId: string): Promise<any[]>;
  create(data: {
    outletId: string;
    paymentMethod: string;
    settlementDate: Date;
    totalTransactions: number;
    grossAmount: number;
    feeAmount: number;
    netAmount: number;
    referenceNumber: string | null;
  }): Promise<any>;
  settle(id: string): Promise<any>;
  dispute(id: string): Promise<any>;
}
