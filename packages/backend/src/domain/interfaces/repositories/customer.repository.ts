export interface ICustomerRepository {
  findById(id: string): Promise<CustomerRecord | null>;
  findByBusinessId(businessId: string): Promise<CustomerRecord[]>;
  findByPhone(businessId: string, phone: string): Promise<CustomerRecord | null>;
  save(customer: CustomerRecord): Promise<CustomerRecord>;
  update(id: string, data: Partial<CustomerRecord>): Promise<CustomerRecord>;
  delete(id: string): Promise<void>;
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
