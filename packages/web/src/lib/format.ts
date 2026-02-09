const idrFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Format number as Indonesian Rupiah currency
 *
 * Handles edge cases:
 * - null/undefined → Rp 0
 * - NaN/Infinity → Rp 0
 * - negative numbers → formatted as negative
 *
 * @param amount - Amount to format
 * @returns Formatted currency string
 *
 * @example
 * ```tsx
 * formatCurrency(15000) // "Rp 15.000"
 * formatCurrency(null) // "Rp 0"
 * formatCurrency(NaN) // "Rp 0"
 * ```
 */
export function formatCurrency(amount: number | null | undefined): string {
  // Handle null/undefined/NaN/Infinity
  if (amount === null || amount === undefined || !isFinite(amount)) {
    return idrFormatter.format(0);
  }
  return idrFormatter.format(amount);
}

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * Format date to Indonesian locale
 *
 * Handles edge cases:
 * - null/undefined → empty string
 * - invalid date → empty string
 *
 * @param date - Date to format (string or Date object)
 * @returns Formatted date string
 *
 * @example
 * ```tsx
 * formatDate('2024-01-15') // "15 Jan 2024"
 * formatDate(null) // ""
 * formatDate('invalid') // ""
 * ```
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '';

  try {
    const dateObj = new Date(date);
    // Check if valid date
    if (isNaN(dateObj.getTime())) return '';
    return dateFormatter.format(dateObj);
  } catch {
    return '';
  }
}

/**
 * Format date and time to Indonesian locale
 *
 * Handles edge cases:
 * - null/undefined → empty string
 * - invalid date → empty string
 *
 * @param date - Date to format (string or Date object)
 * @returns Formatted date-time string
 *
 * @example
 * ```tsx
 * formatDateTime('2024-01-15T14:30:00') // "15 Jan 2024, 14:30"
 * formatDateTime(null) // ""
 * ```
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '';

  try {
    const dateObj = new Date(date);
    // Check if valid date
    if (isNaN(dateObj.getTime())) return '';
    return dateTimeFormatter.format(dateObj);
  } catch {
    return '';
  }
}

/**
 * Format number with thousand separators
 *
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted number string
 *
 * @example
 * ```tsx
 * formatNumber(1234567) // "1.234.567"
 * formatNumber(1234.56, 2) // "1.234,56"
 * formatNumber(null) // "0"
 * ```
 */
export function formatNumber(
  value: number | null | undefined,
  decimals = 0
): string {
  if (value === null || value === undefined || !isFinite(value)) {
    return '0';
  }

  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format percentage value
 *
 * @param value - Percentage value (0-100)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 *
 * @example
 * ```tsx
 * formatPercentage(12.5) // "12,5%"
 * formatPercentage(100) // "100,0%"
 * formatPercentage(null) // "0,0%"
 * ```
 */
export function formatPercentage(
  value: number | null | undefined,
  decimals = 1
): string {
  if (value === null || value === undefined || !isFinite(value)) {
    return `0${decimals > 0 ? ',' + '0'.repeat(decimals) : ''}%`;
  }

  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value) + '%';
}

const timeFormatter = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * Format time only to Indonesian locale
 *
 * @param date - Date to format (string or Date object)
 * @returns Formatted time string (HH:MM)
 *
 * @example
 * ```tsx
 * formatTime('2024-01-15T14:30:00') // "14:30"
 * formatTime(null) // ""
 * ```
 */
export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return '';

  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '';
    return timeFormatter.format(dateObj);
  } catch {
    return '';
  }
}

/**
 * Alias for formatCurrency - Format number as Indonesian Rupiah
 * 
 * @param amount - Amount to format
 * @returns Formatted currency string
 * 
 * @example
 * ```tsx
 * formatRupiah(15000) // "Rp 15.000"
 * ```
 */
export function formatRupiah(amount: number | null | undefined): string {
  return formatCurrency(amount);
}

/**
 * Format duration in minutes to human readable format
 * 
 * @param minutes - Duration in minutes
 * @returns Formatted duration string
 * 
 * @example
 * ```tsx
 * formatDuration(45) // "45 menit"
 * formatDuration(90) // "1j 30m"
 * formatDuration(120) // "2 jam"
 * ```
 */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || !isFinite(minutes) || minutes <= 0) {
    return '0 menit';
  }

  if (minutes < 60) {
    return `${Math.round(minutes)} menit`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);

  if (remainingMinutes === 0) {
    return `${hours} jam`;
  }

  return `${hours}j ${remainingMinutes}m`;
}

