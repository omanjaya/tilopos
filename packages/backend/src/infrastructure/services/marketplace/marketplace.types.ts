/**
 * Common types and interfaces for marketplace integrations
 */

export type MarketplacePlatform = 'gofood' | 'grabfood' | 'shopeefood';

export type MarketplaceOrderStatus =
  | 'new'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'completed'
  | 'cancelled';

export interface MarketplaceCredentials {
  merchantId: string;
  apiKey: string;
  apiSecret: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface MarketplaceVariant {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

export interface MarketplaceModifier {
  id: string;
  groupName: string;
  name: string;
  price: number;
  isRequired: boolean;
}

export interface MarketplaceMenuItem {
  id: string;
  externalId?: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  categoryId?: string;
  categoryName?: string;
  isAvailable: boolean;
  variants?: MarketplaceVariant[];
  modifiers?: MarketplaceModifier[];
}

export interface MarketplaceOrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
  notes?: string;
  variantName?: string;
  modifiers?: { name: string; price: number }[];
}

export interface MarketplaceOrder {
  id: string;
  externalId: string;
  platform: MarketplacePlatform;
  status: MarketplaceOrderStatus;
  customer: {
    name: string;
    phone: string;
    address?: string;
    notes?: string;
  };
  items: MarketplaceOrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod: string;
  isPaid: boolean;
  driverInfo?: {
    name: string;
    phone: string;
    plateNumber: string;
  };
  estimatedPickupTime?: Date;
  createdAt: Date;
  acceptedAt?: Date;
  completedAt?: Date;
}

export interface MarketplaceSettlement {
  id: string;
  period: { start: Date; end: Date };
  totalSales: number;
  commission: number;
  deliveryFee: number;
  adjustments: number;
  netAmount: number;
  status: 'pending' | 'settled' | 'disputed';
  settledAt?: Date;
}

/**
 * Base interface for all marketplace gateway implementations
 */
export interface IMarketplaceGateway {
  platform: MarketplacePlatform;

  // Authentication
  authenticate(credentials: MarketplaceCredentials): Promise<MarketplaceCredentials>;
  refreshToken(credentials: MarketplaceCredentials): Promise<MarketplaceCredentials>;

  // Menu Management
  syncMenu(items: MarketplaceMenuItem[]): Promise<void>;
  updateItemAvailability(itemId: string, isAvailable: boolean): Promise<void>;
  updateItemPrice(itemId: string, price: number): Promise<void>;

  // Order Management
  fetchNewOrders(): Promise<MarketplaceOrder[]>;
  acceptOrder(orderId: string): Promise<void>;
  rejectOrder(orderId: string, reason: string): Promise<void>;
  updateOrderStatus(orderId: string, status: MarketplaceOrderStatus): Promise<void>;

  // Settlements
  fetchSettlements(startDate: Date, endDate: Date): Promise<MarketplaceSettlement[]>;
}
