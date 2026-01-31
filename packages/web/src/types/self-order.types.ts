export interface SelfOrderSession {
  id: string;
  outletId: string;
  tableId: string;
  sessionCode: string;
  status: 'active' | 'closed';
  createdAt: string;
}

export interface SelfOrderMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  categoryName: string;
  isAvailable: boolean;
}

export interface CreateSelfOrderSessionRequest {
  outletId: string;
  tableId: string;
}
