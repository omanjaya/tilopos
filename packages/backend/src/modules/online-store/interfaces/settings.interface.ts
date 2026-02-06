/**
 * Store Settings Interfaces
 *
 * Interfaces for managing online store settings (delivery, operating hours, fees).
 */

export interface StoreSettingsInput {
  deliveryRadius?: number;
  minOrderAmount?: number;
  deliveryFee?: number;
  freeDeliveryThreshold?: number;
  isDeliveryEnabled?: boolean;
  isPickupEnabled?: boolean;
  operatingHoursStart?: string;
  operatingHoursEnd?: string;
  shippingMode?: 'distance' | 'flat_rate' | 'free';
  flatRateAmount?: number;
}

export interface StoreSettingsResult {
  storeId: string;
  settings: Record<string, unknown>;
  updatedAt: Date;
}
