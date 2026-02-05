/**
 * Validation Utilities
 *
 * Centralized validation functions to handle edge cases consistently
 * across the application. Prevents issues with negative numbers, decimals,
 * null/undefined values, and other edge cases.
 */

/**
 * Safely parse a number from string/number input
 *
 * Handles edge cases:
 * - null/undefined → returns default value
 * - empty string → returns default value
 * - "0" → returns 0
 * - negative numbers → returns 0 (if allowNegative is false)
 * - non-numeric strings → returns default value
 *
 * @param value - Input value to parse
 * @param defaultValue - Value to return if parsing fails (default: 0)
 * @param allowNegative - Allow negative numbers (default: false)
 * @returns Parsed number or default value
 *
 * @example
 * ```tsx
 * const price = safeParseNumber(e.target.value); // "123" → 123, "" → 0, "abc" → 0
 * const quantity = safeParseNumber(qty, 1); // null → 1, undefined → 1
 * const change = safeParseNumber(value, 0, true); // allows negative
 * ```
 */
export function safeParseNumber(
  value: string | number | null | undefined,
  defaultValue = 0,
  allowNegative = false
): number {
  // Handle null/undefined
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }

  // Handle already-number type
  if (typeof value === 'number') {
    if (isNaN(value) || !isFinite(value)) {
      return defaultValue;
    }
    return allowNegative ? value : Math.max(0, value);
  }

  // Parse string
  const parsed = parseFloat(value);

  // Check if valid number
  if (isNaN(parsed) || !isFinite(parsed)) {
    return defaultValue;
  }

  // Clamp to non-negative if needed
  return allowNegative ? parsed : Math.max(0, parsed);
}

/**
 * Safe division to prevent divide by zero errors
 *
 * @param numerator - Number to divide
 * @param denominator - Number to divide by
 * @param defaultValue - Value to return if denominator is 0 (default: 0)
 * @returns Result of division or default value
 *
 * @example
 * ```tsx
 * const average = safeDivide(total, count); // count=0 → 0, not NaN
 * const percentage = safeDivide(part, whole, null); // whole=0 → null
 * ```
 */
export function safeDivide(
  numerator: number,
  denominator: number,
  defaultValue = 0
): number {
  if (denominator === 0 || !isFinite(denominator)) {
    return defaultValue;
  }
  const result = numerator / denominator;
  return isFinite(result) ? result : defaultValue;
}

/**
 * Clamp a number between min and max values
 *
 * @param value - Number to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 *
 * @example
 * ```tsx
 * const qty = clamp(userInput, 1, 999); // ensures 1 <= qty <= 999
 * const percentage = clamp(value, 0, 100);
 * ```
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Round to specified decimal places
 *
 * Handles floating point precision issues.
 *
 * @param value - Number to round
 * @param decimals - Number of decimal places (default: 2)
 * @returns Rounded number
 *
 * @example
 * ```tsx
 * const price = roundToDecimals(10.12555, 2); // 10.13
 * const total = roundToDecimals(sum, 0); // integer
 * ```
 */
export function roundToDecimals(value: number, decimals = 2): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Validate and sanitize number input for controlled components
 *
 * Returns cleaned value suitable for input value prop.
 * Prevents non-numeric characters (except decimal point).
 *
 * @param value - Raw input value
 * @param allowDecimal - Allow decimal point (default: true)
 * @returns Sanitized string for input value
 *
 * @example
 * ```tsx
 * <Input
 *   value={price}
 *   onChange={(e) => setPrice(sanitizeNumberInput(e.target.value))}
 * />
 * ```
 */
export function sanitizeNumberInput(value: string, allowDecimal = true): string {
  if (!value) return '';

  // Remove all non-numeric except decimal point (if allowed)
  const pattern = allowDecimal ? /[^\d.]/g : /[^\d]/g;
  let cleaned = value.replace(pattern, '');

  // Ensure only one decimal point
  if (allowDecimal) {
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
  }

  return cleaned;
}

/**
 * Handle keyboard events for number inputs
 *
 * Prevents invalid input at keyboard level.
 *
 * @param e - Keyboard event
 * @param allowNegative - Allow negative sign (default: false)
 * @param allowDecimal - Allow decimal point (default: true)
 *
 * @example
 * ```tsx
 * <Input
 *   type="number"
 *   onKeyDown={(e) => preventInvalidNumberInput(e)}
 * />
 * ```
 */
export function preventInvalidNumberInput(
  e: React.KeyboardEvent<HTMLInputElement>,
  allowNegative = false,
  allowDecimal = true
): void {
  const invalidKeys = ['e', 'E', '+'];

  if (!allowNegative) {
    invalidKeys.push('-');
  }

  if (!allowDecimal) {
    invalidKeys.push('.');
  }

  if (invalidKeys.includes(e.key)) {
    e.preventDefault();
  }
}

/**
 * Validate that a value is within acceptable range
 *
 * @param value - Value to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns True if valid, false otherwise
 *
 * @example
 * ```tsx
 * if (!isInRange(quantity, 1, 999)) {
 *   toast.error('Quantity must be between 1 and 999');
 * }
 * ```
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max && isFinite(value);
}

/**
 * Format percentage with safe division
 *
 * @param part - Part value
 * @param whole - Whole value
 * @param decimals - Decimal places (default: 1)
 * @returns Formatted percentage string
 *
 * @example
 * ```tsx
 * const successRate = safePercentage(successful, total); // "85.5%"
 * const margin = safePercentage(profit, revenue, 2); // "12.35%"
 * ```
 */
export function safePercentage(part: number, whole: number, decimals = 1): string {
  const percentage = safeDivide(part * 100, whole, 0);
  return `${roundToDecimals(percentage, decimals)}%`;
}

/**
 * Check if a value is a valid positive number
 *
 * @param value - Value to check
 * @returns True if valid positive number
 *
 * @example
 * ```tsx
 * if (!isPositiveNumber(price)) {
 *   errors.price = 'Price must be a positive number';
 * }
 * ```
 */
export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && isFinite(value) && value > 0;
}

/**
 * Check if a value is a valid non-negative number (including zero)
 *
 * @param value - Value to check
 * @returns True if valid non-negative number
 */
export function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && isFinite(value) && value >= 0;
}
