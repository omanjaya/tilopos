/** Backend enum SelfOrderSessionStatus. */
export type SelfOrderSessionStatus = 'active' | 'submitted' | 'paid' | 'expired';

export interface SelfOrderSessionItem {
  id: string;
  productId: string;
  variantId: string | null;
  productName: string;
  imageUrl: string | null;
  variantName: string | null;
  quantity: number;
  notes: string | null;
}

/** GET /self-order/sessions/:code (public-safe fields). 410 when expired, 404 unknown. */
export interface SelfOrderSession {
  id: string;
  outletId: string;
  tableId: string | null;
  sessionCode: string;
  status: SelfOrderSessionStatus;
  expiresAt: string;
  createdAt: string;
  language: string;
  paymentStatus: string | null;
  outletName: string;
  tableNumber: string | null;
  items: SelfOrderSessionItem[];
}

export interface SelfOrderMenuVariant {
  id: string;
  name: string;
  price: number;
}

/** GET /self-order/menu item. `price` is the lowest variant price when variants exist. */
export interface SelfOrderMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  categoryName: string;
  isAvailable: boolean;
  variants?: SelfOrderMenuVariant[];
}

/** GET /self-order/sessions/:code/total (server-computed). */
export interface SelfOrderSessionTotal {
  subtotal: number;
  taxAmount: number;
  serviceChargeAmount: number;
  grandTotal: number;
  itemCount: number;
}
