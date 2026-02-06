/**
 * Loyalty Module Exports
 *
 * Central export point for all loyalty-related services, types, and utilities.
 */

// Main service (facade)
export { LoyaltyService } from './loyalty.service';

// Specialized services
export { PointsManagementService } from './services/points-management.service';
export { TierManagementService } from './services/tier-management.service';
export { ExpiryService } from './services/expiry.service';
export { AnalyticsService } from './services/analytics.service';

// Repository
export { LoyaltyRepository } from './repositories/loyalty.repository';

// Business rules
export { PointsRules } from './business-rules/points.rules';
export { TierRules } from './business-rules/tier.rules';
export { ExpiryRules } from './business-rules/expiry.rules';

// Types and interfaces
export type {
  LoyaltyConfig,
  TierConfig,
  EarnPointsResult,
  RedeemPointsResult,
  PointsCalculation,
  CustomerLoyaltyInfo,
  ILoyaltyRepository,
} from './types/interfaces';

// Module
export { LoyaltyModule } from './loyalty.module';
