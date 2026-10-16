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
  customerType?: string;
  loyaltyTier?: string;
  lastVisitAt?: string | null;
  isActive: boolean;
  businessId: string;
  createdAt: string;
  updatedAt: string;
}

/** POST /customers (CreateCustomerDto). Loyalty/spend fields are server-owned (400 if sent). */
export interface CreateCustomerRequest {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  /** YYYY-MM-DD */
  dateOfBirth?: string;
  notes?: string;
}

/** PUT /customers/:id (UpdateCustomerDto) — `null` clears the field on the server. */
export interface UpdateCustomerRequest {
  name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  dateOfBirth?: string | null;
  notes?: string | null;
}

// Customer Segments (built-in, computed by the backend:
// GET /customers/segments and GET /customers/segments/:segment)
export type SegmentCode = 'new' | 'returning' | 'vip' | 'at-risk' | 'inactive';

export interface CustomerSegmentSummary {
  segment: SegmentCode;
  label: string;
  description: string;
  count: number;
}

export interface CustomerSegmentsResponse {
  totalCustomers: number;
  segments: CustomerSegmentSummary[];
}

export interface SegmentCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  totalSpent: number;
  visitCount: number;
  loyaltyTier: string;
  loyaltyPoints: number;
  lastVisitAt: string | null;
  createdAt: string;
}
