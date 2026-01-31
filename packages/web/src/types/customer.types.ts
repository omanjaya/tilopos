export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  dateOfBirth: string | null;
  notes: string | null;
  loyaltyPoints: number;
  totalSpent: number;
  visitCount: number;
  isActive: boolean;
  businessId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerRequest {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  notes?: string;
}

export interface UpdateCustomerRequest extends Partial<CreateCustomerRequest> {
  isActive?: boolean;
}

// Customer Segments
export type SegmentType = 'new' | 'regular' | 'vip' | 'at_risk' | 'churned' | 'custom';

export interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  type: SegmentType;
  customerCount: number;
  criteria: SegmentCriteria | null;
  businessId: string;
  createdAt: string;
}

export interface SegmentCriteria {
  minSpend?: number;
  maxSpend?: number;
  minVisits?: number;
  maxVisits?: number;
  loyaltyTier?: string;
  daysSinceLastVisit?: number;
  maxDaysSinceLastVisit?: number;
}

export interface CreateSegmentRequest {
  name: string;
  description: string;
  criteria: SegmentCriteria;
}
