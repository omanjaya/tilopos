/** Loyalty/spend counters are owned by the loyalty use-cases (atomic increments), never update(). */
export type CustomerUpdateData = Partial<
  Omit<CustomerRecord, 'loyaltyPoints' | 'loyaltyTier' | 'totalSpent' | 'visitCount'>
>;

/** Pass businessId whenever the id comes from a client (R3); it becomes required later. */
export interface ICustomerRepository {
  findById(id: string, businessId?: string): Promise<CustomerRecord | null>;
  findByBusinessId(businessId: string): Promise<CustomerRecord[]>;
  findByPhone(businessId: string, phone: string): Promise<CustomerRecord | null>;
  save(customer: CustomerRecord): Promise<CustomerRecord>;
  update(id: string, data: CustomerUpdateData, businessId?: string): Promise<CustomerRecord>;
  delete(id: string, businessId?: string): Promise<void>;
}

export interface CustomerRecord {
  id: string;
  businessId: string;
  name: string;
  email: string | null;
  phone: string | null;
  loyaltyPoints: number;
  loyaltyTier: string;
  totalSpent: number;
  visitCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
