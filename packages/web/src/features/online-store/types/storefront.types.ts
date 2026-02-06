export interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
  variant?: { id: string; name: string; price: number };
  modifiers?: { id: string; name: string; price: number }[];
}

export interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

export type DeliveryMethod = 'delivery' | 'pickup';

export type OrderStatus = 'idle' | 'submitting' | 'success' | 'error';

export type CheckoutStep = 0 | 1 | 2 | 3;
