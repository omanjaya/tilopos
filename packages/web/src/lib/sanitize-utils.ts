/**
 * Input Sanitization Utilities
 *
 * Functions to sanitize and validate user input to prevent security issues
 * and ensure data integrity.
 */

/**
 * Trim whitespace from string input
 *
 * Handles null/undefined safely.
 *
 * @param value - String to trim
 * @returns Trimmed string or empty string if null/undefined
 *
 * @example
 * ```tsx
 * <Input
 *   value={name}
 *   onChange={(e) => setName(e.target.value)}
 *   onBlur={(e) => setName(trimWhitespace(e.target.value))}
 * />
 * ```
 */
export function trimWhitespace(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

/**
 * Sanitize text input by removing potentially dangerous characters
 *
 * Removes:
 * - Script tags
 * - HTML tags (optional)
 * - SQL injection patterns (basic)
 * - Excessive whitespace
 *
 * @param value - String to sanitize
 * @param allowHtml - Allow HTML tags (default: false)
 * @returns Sanitized string
 *
 * @example
 * ```tsx
 * const clean = sanitizeText(userInput);
 * // "<script>alert('xss')</script>Hello" → "Hello"
 * ```
 */
export function sanitizeText(
  value: string | null | undefined,
  allowHtml = false
): string {
  if (!value) return '';

  let cleaned = value;

  // Remove script tags and their content
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove on* event handlers
  cleaned = cleaned.replace(/\son\w+\s*=/gi, '');

  // Remove HTML tags if not allowed
  if (!allowHtml) {
    cleaned = cleaned.replace(/<[^>]*>/g, '');
  }

  // Remove basic SQL injection patterns
  cleaned = cleaned.replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi, '');

  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Validate email format
 *
 * Uses a reasonable regex that covers most valid email formats.
 *
 * @param email - Email to validate
 * @returns True if valid email format
 *
 * @example
 * ```tsx
 * if (!isValidEmail(email)) {
 *   errors.email = 'Format email tidak valid';
 * }
 * ```
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (Indonesian)
 *
 * Accepts formats:
 * - 08xxxxxxxxxx
 * - +628xxxxxxxxxx
 * - 628xxxxxxxxxx
 *
 * @param phone - Phone number to validate
 * @returns True if valid Indonesian phone format
 *
 * @example
 * ```tsx
 * if (!isValidPhone(phone)) {
 *   errors.phone = 'Format nomor telepon tidak valid';
 * }
 * ```
 */
export function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;

  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // Check Indonesian phone patterns
  // 08xxxxxxxxxx (10-13 digits)
  // 628xxxxxxxxxx (11-14 digits)
  const phoneRegex = /^(0|62)8\d{8,11}$/;
  return phoneRegex.test(cleaned);
}

/**
 * Format phone number to standard format
 *
 * Converts various formats to 08xxxxxxxxxx
 *
 * @param phone - Phone number to format
 * @returns Formatted phone number or empty string if invalid
 *
 * @example
 * ```tsx
 * formatPhone('+62812345678') // "0812345678"
 * formatPhone('62812345678') // "0812345678"
 * formatPhone('0812345678') // "0812345678"
 * ```
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';

  // Remove all non-numeric
  const cleaned = phone.replace(/\D/g, '');

  // Convert 62xxx to 0xxx
  if (cleaned.startsWith('62')) {
    return '0' + cleaned.slice(2);
  }

  // Already in 0xxx format
  if (cleaned.startsWith('0')) {
    return cleaned;
  }

  // Invalid format
  return '';
}

/**
 * Validate URL format
 *
 * @param url - URL to validate
 * @returns True if valid URL format
 *
 * @example
 * ```tsx
 * if (!isValidUrl(website)) {
 *   errors.website = 'Format URL tidak valid';
 * }
 * ```
 */
export function isValidUrl(url: string | null | undefined): boolean {
  if (!url) return false;

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize filename for safe storage
 *
 * Removes/replaces characters that could cause file system issues.
 *
 * @param filename - Filename to sanitize
 * @returns Safe filename
 *
 * @example
 * ```tsx
 * const safe = sanitizeFilename('my file (1).txt'); // "my-file-1.txt"
 * ```
 */
export function sanitizeFilename(filename: string | null | undefined): string {
  if (!filename) return 'untitled';

  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '-') // Replace special chars with dash
    .replace(/-+/g, '-') // Replace multiple dashes with single
    .replace(/^-|-$/g, '') // Remove leading/trailing dashes
    .toLowerCase();
}

/**
 * Truncate text to specified length
 *
 * Adds ellipsis if truncated.
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @param ellipsis - String to append if truncated (default: "...")
 * @returns Truncated text
 *
 * @example
 * ```tsx
 * truncateText('Long product description here', 20)
 * // "Long product descri..."
 * ```
 */
export function truncateText(
  text: string | null | undefined,
  maxLength: number,
  ellipsis = '...'
): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;

  return text.slice(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Check if string is empty (null, undefined, or whitespace only)
 *
 * @param value - String to check
 * @returns True if empty
 *
 * @example
 * ```tsx
 * if (isEmpty(name)) {
 *   errors.name = 'Nama tidak boleh kosong';
 * }
 * ```
 */
export function isEmpty(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

/**
 * Escape HTML special characters
 *
 * Prevents XSS when displaying user content.
 *
 * @param text - Text to escape
 * @returns Escaped text
 *
 * @example
 * ```tsx
 * const safe = escapeHtml(userComment);
 * // "<script>" → "&lt;script&gt;"
 * ```
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'/]/g, (char) => map[char] ?? char);
}
