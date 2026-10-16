/**
 * Store Settings Interfaces
 *
 * Interfaces for managing online store settings (delivery, operating hours, fees).
 */

export interface StoreSettingsResult {
  storeId: string;
  settings: Record<string, unknown>;
  updatedAt: Date;
}
