/**
 * Catalog Sync Interfaces
 *
 * Interfaces for syncing products from main catalog to online store catalog.
 */

export interface CatalogSyncResult {
  synced: number;
  skipped: number;
  outOfStock: number;
  lastSyncAt: string;
}
