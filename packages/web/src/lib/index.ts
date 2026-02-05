/**
 * Utility Library Index
 *
 * Centralized exports for all utility functions.
 * Import from here for better tree-shaking and easier maintenance.
 *
 * @example
 * ```tsx
 * // Instead of multiple imports:
 * import { formatCurrency } from '@/lib/format';
 * import { safeParseNumber } from '@/lib/validation-utils';
 * import { isEmptyArray } from '@/lib/array-utils';
 *
 * // You can import from one place:
 * import { formatCurrency, safeParseNumber, isEmptyArray } from '@/lib';
 * ```
 */

// Format utilities
export {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercentage,
} from './format';

// Validation utilities
export {
  safeParseNumber,
  safeDivide,
  clamp,
  roundToDecimals,
  sanitizeNumberInput,
  preventInvalidNumberInput,
  isInRange,
  safePercentage,
  isPositiveNumber,
  isNonNegativeNumber,
} from './validation-utils';

// Array utilities
export {
  safeArrayAccess,
  firstItem,
  lastItem,
  isEmptyArray,
  filterNullish,
  sumArray,
  averageArray,
  maxArray,
  minArray,
  groupBy,
  chunkArray,
} from './array-utils';

// Date utilities
export {
  getPreviousPeriod,
  calculatePercentageChange,
  formatPercentageChange,
  isValidDate,
  isFutureDate,
  isPastDate,
} from './date-utils';

// Sanitization utilities
export {
  trimWhitespace,
  sanitizeText,
  isValidEmail,
  isValidPhone,
  formatPhone,
  isValidUrl,
  sanitizeFilename,
  truncateText,
  isEmpty,
  escapeHtml,
} from './sanitize-utils';

// Query utilities (TanStack Query helpers)
export {
  setupOptimisticUpdate,
  setupOptimisticListUpdate,
  invalidateQueries,
  refetchQueries,
  isAnyQueryLoading,
} from './query-utils';

// Error handler utilities
export {
  handleMutationError,
  handleQueryError,
  handleDeleteError,
  handleCreateError,
  handleUpdateError,
  handleApiError,
  handleNetworkError,
  getErrorMessage,
  isErrorStatus,
  isValidationError,
  isUnauthorizedError,
  isForbiddenError,
  isNotFoundError,
} from './error-handlers';

// Core utilities
export { cn } from './utils';
export { toast } from './toast-utils';

// Constants
export * from './constants';
