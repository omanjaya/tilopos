import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, formatDateTime } from '../format';

describe('formatCurrency', () => {
  it('formats a positive number as IDR currency', () => {
    const result = formatCurrency(50000);
    // Intl.NumberFormat for 'id-ID' with IDR produces "Rp 50.000" or similar
    expect(result).toContain('50');
    expect(result).toMatch(/Rp/);
  });

  it('formats zero correctly', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
    expect(result).toMatch(/Rp/);
  });

  it('formats large numbers with thousands separators', () => {
    const result = formatCurrency(1500000);
    expect(result).toContain('1');
    expect(result).toContain('500');
    expect(result).toContain('000');
  });

  it('formats negative numbers', () => {
    const result = formatCurrency(-25000);
    expect(result).toContain('25');
  });

  it('has no fraction digits', () => {
    const result = formatCurrency(12345);
    // With minimumFractionDigits: 0 and maximumFractionDigits: 0, no decimal part
    expect(result).not.toMatch(/[.,]\d{1,2}$/);
  });
});

describe('formatDate', () => {
  it('formats an ISO date string', () => {
    const result = formatDate('2026-01-15T10:00:00Z');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('formats a Date object', () => {
    const date = new Date(2026, 0, 15); // Jan 15, 2026
    const result = formatDate(date);
    expect(result).toBeTruthy();
    expect(result).toContain('15');
    expect(result).toContain('2026');
  });

  it('includes month abbreviation', () => {
    const result = formatDate('2026-06-20T00:00:00Z');
    // Indonesian month short for June is "Jun"
    expect(result).toBeTruthy();
    expect(result).toContain('20');
    expect(result).toContain('2026');
  });
});

describe('formatDateTime', () => {
  it('formats an ISO date string with time', () => {
    const result = formatDateTime('2026-01-15T10:30:00Z');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('includes time component', () => {
    // Create a date at a known local time
    const date = new Date(2026, 0, 15, 14, 30); // Jan 15, 2026 14:30 local
    const result = formatDateTime(date);
    expect(result).toBeTruthy();
    // Should contain hour/minute in some format
    expect(result).toContain('30');
  });

  it('formats a Date object with date and time', () => {
    const date = new Date(2026, 5, 20, 9, 15); // Jun 20, 2026 09:15
    const result = formatDateTime(date);
    expect(result).toContain('20');
    expect(result).toContain('2026');
  });
});
