import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, formatDateTime } from './format';

describe('formatCurrency', () => {
  it('formats number as IDR currency', () => {
    const result = formatCurrency(50000);
    expect(result).toContain('50');
  });

  it('formats zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
  });

  it('formats negative numbers', () => {
    const result = formatCurrency(-10000);
    expect(result).toContain('10');
  });

  it('formats large numbers', () => {
    const result = formatCurrency(1000000000);
    expect(result).toContain('1.000.000.000');
  });

  it('rounds decimal values (no fraction digits)', () => {
    const result = formatCurrency(12345.67);
    // IDR formatter has minimumFractionDigits: 0, maximumFractionDigits: 0
    expect(result).toContain('12.346');
  });

  it('contains Rp prefix', () => {
    const result = formatCurrency(100);
    expect(result).toMatch(/Rp/);
  });
});

describe('formatDate', () => {
  it('formats ISO date string', () => {
    const result = formatDate('2026-01-15T10:00:00Z');
    expect(result).toBeTruthy();
  });

  it('formats a Date object', () => {
    const result = formatDate(new Date('2026-06-20T00:00:00Z'));
    expect(result).toBeTruthy();
    expect(result).toContain('2026');
  });

  it('includes the year', () => {
    const result = formatDate('2025-06-15T00:00:00Z');
    expect(result).toContain('2025');
  });

  it('returns a non-empty string for epoch date', () => {
    const result = formatDate('1970-01-01T00:00:00Z');
    expect(result).toBeTruthy();
  });
});

describe('formatDateTime', () => {
  it('formats ISO date string with time', () => {
    const result = formatDateTime('2026-01-15T10:30:00Z');
    expect(result).toBeTruthy();
  });

  it('formats a Date object with time', () => {
    const result = formatDateTime(new Date('2026-03-10T14:45:00Z'));
    expect(result).toBeTruthy();
    expect(result).toContain('2026');
  });

  it('includes the year in output', () => {
    const result = formatDateTime('2025-06-15T08:00:00Z');
    expect(result).toContain('2025');
  });

  it('returns a string longer than formatDate (includes time component)', () => {
    const dateOnly = formatDate('2026-01-15T10:30:00Z');
    const dateTime = formatDateTime('2026-01-15T10:30:00Z');
    expect(dateTime.length).toBeGreaterThan(dateOnly.length);
  });
});
