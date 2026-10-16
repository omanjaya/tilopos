export interface CartItem {
  /** Stable line id: productId + variantId. */
  lineId: string;
  productId: string;
  variantId?: string;
  name: string;
  variantName?: string;
  /** Unit price shown to the customer (variant price when chosen). Server re-prices on checkout. */
  price: number;
  quantity: number;
  imageUrl?: string | null;
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
