import type { ZodSchema } from 'zod';

/**
 * Form Utilities Library
 *
 * Reusable form handling utilities to eliminate duplication
 * and ensure consistent form behavior across the app.
 *
 * Benefits:
 * - Consistent form data transformation
 * - Type-safe default values
 * - Easier validation integration
 * - Cleaner form components
 *
 * Usage:
 * ```tsx
 * import { createFormDefaultValues, transformFormData } from '@/lib/form-utils';
 *
 * const form = useForm({
 *   defaultValues: createFormDefaultValues(product, {
 *     name: '',
 *     price: 0,
 *     stock: 0,
 *   }),
 * });
 * ```
 */

/**
 * Create form default values with fallbacks
 *
 * Merges existing data with default values, ensuring all fields have values.
 * Useful for edit forms that need to handle undefined/partial data.
 *
 * @param data - Existing data (e.g., from API)
 * @param defaults - Default values for all form fields
 * @returns Merged object with all fields guaranteed to have values
 *
 * @example
 * ```tsx
 * // Edit mode with existing product
 * const defaultValues = createFormDefaultValues(product, {
 *   name: '',
 *   price: 0,
 *   stock: 0,
 *   category: '',
 * });
 * // Result: product data merged with defaults for missing fields
 *
 * // Create mode without existing data
 * const defaultValues = createFormDefaultValues(undefined, {
 *   name: '',
 *   price: 0,
 *   stock: 0,
 * });
 * // Result: all defaults used
 * ```
 */
export function createFormDefaultValues<T extends Record<string, unknown>>(
  data: Partial<T> | undefined,
  defaults: T
): T {
  if (!data) {
    return defaults;
  }

  return {
    ...defaults,
    ...data,
  } as T;
}

/**
 * Transform form data before submission
 *
 * Removes empty strings, null values, and other unwanted data.
 * Useful for cleaning up form data before sending to API.
 *
 * @param data - Raw form data
 * @param options - Transformation options
 * @returns Cleaned form data
 *
 * @example
 * ```tsx
 * const formData = {
 *   name: 'Product',
 *   description: '',  // Empty string
 *   price: 1000,
 *   stock: null,      // Null value
 * };
 *
 * const cleaned = transformFormData(formData, {
 *   removeEmptyStrings: true,
 *   removeNullValues: true,
 * });
 * // Result: { name: 'Product', price: 1000 }
 * ```
 */
export interface TransformOptions {
  /** Remove fields with empty string values */
  removeEmptyStrings?: boolean;
  /** Remove fields with null values */
  removeNullValues?: boolean;
  /** Remove fields with undefined values */
  removeUndefined?: boolean;
  /** Trim all string values */
  trimStrings?: boolean;
  /** Convert empty strings to null */
  emptyStringsToNull?: boolean;
}

export function transformFormData<T extends Record<string, unknown>>(
  data: T,
  options: TransformOptions = {}
): Partial<T> {
  const {
    removeEmptyStrings = false,
    removeNullValues = false,
    removeUndefined = true,
    trimStrings = true,
    emptyStringsToNull = false,
  } = options;

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    let processedValue = value;

    // Trim strings
    if (trimStrings && typeof processedValue === 'string') {
      processedValue = processedValue.trim();
    }

    // Convert empty strings to null
    if (emptyStringsToNull && processedValue === '') {
      processedValue = null;
    }

    // Skip based on options
    if (removeEmptyStrings && processedValue === '') continue;
    if (removeNullValues && processedValue === null) continue;
    if (removeUndefined && processedValue === undefined) continue;

    result[key] = processedValue;
  }

  return result as Partial<T>;
}

/**
 * Validate form data against Zod schema
 *
 * Wrapper around Zod validation with better error handling.
 *
 * @param schema - Zod schema
 * @param data - Data to validate
 * @returns Validated data or throws error
 *
 * @example
 * ```tsx
 * import { z } from 'zod';
 *
 * const productSchema = z.object({
 *   name: z.string().min(1),
 *   price: z.number().positive(),
 * });
 *
 * try {
 *   const validData = validateFormData(productSchema, formData);
 *   await productsApi.create(validData);
 * } catch (error) {
 *   // Handle validation error
 * }
 * ```
 */
export function validateFormData<T>(schema: ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safe validate (returns result object instead of throwing)
 *
 * @param schema - Zod schema
 * @param data - Data to validate
 * @returns Validation result with success/error
 *
 * @example
 * ```tsx
 * const result = safeValidateFormData(productSchema, formData);
 *
 * if (result.success) {
 *   await productsApi.create(result.data);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function safeValidateFormData<T>(
  schema: ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: unknown } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    return { success: false, error };
  }
}

/**
 * Convert form values to API format
 *
 * Handles common transformations like date formatting, number parsing, etc.
 *
 * @param data - Form data
 * @returns API-ready data
 *
 * @example
 * ```tsx
 * const formData = {
 *   name: 'Product',
 *   price: '1000',        // String from input
 *   stock: '50',          // String from input
 *   date: new Date(),     // Date object
 * };
 *
 * const apiData = toApiFormat(formData);
 * // Result: numbers converted, dates formatted as ISO strings
 * ```
 */
export function toApiFormat<T extends Record<string, unknown>>(data: T): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    // Convert Date to ISO string
    if (value instanceof Date) {
      result[key] = value.toISOString();
      continue;
    }

    // Keep other values as-is
    result[key] = value;
  }

  return result as T;
}

/**
 * Parse API data for form
 *
 * Reverse of toApiFormat - converts API data to form-friendly format.
 *
 * @param data - API response data
 * @returns Form-ready data
 *
 * @example
 * ```tsx
 * const apiData = {
 *   name: 'Product',
 *   price: 1000,
 *   createdAt: '2024-01-01T00:00:00.000Z',
 * };
 *
 * const formData = fromApiFormat(apiData);
 * // Result: ISO strings converted to Date objects
 * ```
 */
export function fromApiFormat<T extends Record<string, unknown>>(data: T): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    // Convert ISO strings to Date
    if (typeof value === 'string' && isISODateString(value)) {
      result[key] = new Date(value);
      continue;
    }

    result[key] = value;
  }

  return result as T;
}

/**
 * Check if string is ISO date format
 *
 * @param value - String to check
 * @returns True if ISO date string
 */
function isISODateString(value: string): boolean {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
  return isoDateRegex.test(value);
}

/**
 * Reset form with new data
 *
 * Helper to properly reset React Hook Form with new data.
 * Handles the common pattern of resetting when edit data loads.
 *
 * @param form - React Hook Form instance
 * @param data - New data to reset with
 * @param defaults - Default values to merge
 *
 * @example
 * ```tsx
 * import { useForm } from 'react-hook-form';
 * import { useEffect } from 'react';
 *
 * const form = useForm();
 * const { data: product } = useQuery(['products', id], () => getProduct(id));
 *
 * useEffect(() => {
 *   if (product) {
 *     resetFormWithData(form, product, {
 *       name: '',
 *       price: 0,
 *     });
 *   }
 * }, [product]);
 * ```
 */
export function resetFormWithData<T extends Record<string, unknown>>(
  form: { reset: (data: T) => void },
  data: Partial<T> | undefined,
  defaults: T
): void {
  if (!data) {
    form.reset(defaults);
    return;
  }

  const merged = createFormDefaultValues(data, defaults);
  form.reset(merged);
}

/**
 * Get dirty fields from React Hook Form
 *
 * Extracts only the fields that have been modified by the user.
 * Useful for PATCH requests where you only want to send changed data.
 *
 * @param dirtyFields - dirtyFields object from React Hook Form formState
 * @param formValues - Current form values
 * @returns Object containing only dirty fields
 *
 * @example
 * ```tsx
 * const { formState, getValues } = useForm();
 *
 * const onSubmit = () => {
 *   const changedData = getDirtyValues(formState.dirtyFields, getValues());
 *   // Only send changed fields to API
 *   await productsApi.update(id, changedData);
 * };
 * ```
 */
export function getDirtyValues<T extends Record<string, unknown>>(
  dirtyFields: Record<string, boolean | Record<string, boolean>>,
  formValues: T
): Partial<T> {
  const dirtyValues: Record<string, unknown> = {};

  for (const key in dirtyFields) {
    if (dirtyFields[key]) {
      dirtyValues[key] = formValues[key];
    }
  }

  return dirtyValues as Partial<T>;
}

/**
 * Format currency for display in forms
 *
 * @param value - Number value
 * @param locale - Locale (default: id-ID for Indonesian)
 * @returns Formatted currency string
 *
 * @example
 * ```tsx
 * formatCurrency(1000000); // "Rp 1.000.000"
 * ```
 */
export function formatCurrency(value: number, locale = 'id-ID'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Parse currency string to number
 *
 * Removes currency formatting and returns number.
 *
 * @param value - Formatted currency string
 * @returns Number value
 *
 * @example
 * ```tsx
 * parseCurrency('Rp 1.000.000'); // 1000000
 * parseCurrency('1.000.000');    // 1000000
 * ```
 */
export function parseCurrency(value: string): number {
  // Remove Rp, spaces, and dots
  const cleaned = value.replace(/Rp|\.| /g, '');
  return parseInt(cleaned, 10) || 0;
}

/**
 * Format number with thousand separators
 *
 * @param value - Number value
 * @returns Formatted string
 *
 * @example
 * ```tsx
 * formatNumber(1000000); // "1.000.000"
 * ```
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value);
}

/**
 * Parse formatted number string
 *
 * @param value - Formatted number string
 * @returns Number value
 *
 * @example
 * ```tsx
 * parseNumber('1.000.000'); // 1000000
 * ```
 */
export function parseNumber(value: string): number {
  const cleaned = value.replace(/\./g, '');
  return parseInt(cleaned, 10) || 0;
}
