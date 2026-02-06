/**
 * Customers Module
 *
 * Exports services, types, and interfaces for customer management
 */

// Services
export { CustomersService } from './customers.service';
export { CustomerSegmentsService } from './customer-segments.service';

// Types and Interfaces
export type {
  SegmentName,
  CustomerSegmentSummary,
  SegmentCustomer,
  PurchaseHistoryItem,
  PurchaseHistoryPayment,
  PurchaseHistoryTransaction,
  PurchaseHistoryResult,
  CustomerRow,
  ExportCustomerData,
  SegmentsSummaryResult,
} from './customers.types';

export { VALID_LOYALTY_TIERS, SEGMENT_TIME_PERIODS, SEGMENT_CRITERIA } from './customers.types';

// Module
export { CustomersModule } from './customers.module';
