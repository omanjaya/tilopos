/**
 * Test Utilities
 *
 * Helper functions for testing edge cases.
 * Use these in unit tests to verify edge case handling.
 */

/**
 * Generate test cases for numeric edge cases
 */
export const numericEdgeCases = {
  valid: [0, 1, -1, 100, 0.5, 999999999],
  invalid: [NaN, Infinity, -Infinity],
  nullish: [null, undefined],
  stringNumbers: ['0', '123', '12.34', '-5', 'abc', '', '  '],
  extreme: [Number.MAX_VALUE, Number.MIN_VALUE, Number.MAX_SAFE_INTEGER],
};

/**
 * Generate test cases for date edge cases
 */
export const dateEdgeCases = {
  valid: [
    '2024-01-01',
    '2024-12-31',
    new Date('2024-06-15'),
    new Date(),
  ],
  invalid: [
    'invalid-date',
    '2024-13-01', // Invalid month
    '2024-02-30', // Invalid day
    'abc',
    '',
  ],
  nullish: [null, undefined],
  future: [new Date(Date.now() + 86400000)], // Tomorrow
  past: [new Date(Date.now() - 86400000)], // Yesterday
};

/**
 * Generate test cases for array edge cases
 */
export const arrayEdgeCases = {
  empty: [],
  nullish: [null, undefined],
  withNulls: [1, null, 2, undefined, 3],
  single: [1],
  large: Array.from({ length: 10000 }, (_, i) => i),
};

/**
 * Generate test cases for string edge cases
 */
export const stringEdgeCases = {
  empty: ['', '   ', '\t\n'],
  nullish: [null, undefined],
  normal: ['hello', 'Hello World', 'Test123'],
  xss: [
    '<script>alert("xss")</script>',
    '<img src=x onerror=alert(1)>',
    'javascript:alert(1)',
  ],
  sql: [
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    'SELECT * FROM users',
  ],
  special: ['!@#$%^&*()', '🎉 Emoji 🚀', 'Ñoño'],
  long: 'a'.repeat(10000),
};

/**
 * Mock API responses for testing
 */
export const mockApiResponses = {
  success: <T>(data: T) => Promise.resolve({ data }),
  error: (status: number, message: string) =>
    Promise.reject({
      response: {
        status,
        data: { message },
      },
    }),
  networkError: () =>
    Promise.reject({
      message: 'Network Error',
      code: 'ERR_NETWORK',
    }),
  timeout: () =>
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 1000)
    ),
};

/**
 * Test a function with all numeric edge cases
 */
export function testNumericEdgeCases(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: (value: any) => any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expectedForInvalid: any
) {
  const results = {
    valid: numericEdgeCases.valid.map((v) => ({
      input: v,
      output: fn(v),
    })),
    invalid: numericEdgeCases.invalid.map((v) => ({
      input: v,
      output: fn(v),
      expectsDefault: fn(v) === expectedForInvalid,
    })),
    nullish: numericEdgeCases.nullish.map((v) => ({
      input: v,
      output: fn(v),
      expectsDefault: fn(v) === expectedForInvalid,
    })),
  };

  return results;
}

/**
 * Test a function with all array edge cases
 */
export function testArrayEdgeCases(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: (array: any) => any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expectedForEmpty: any
) {
  return {
    empty: {
      input: arrayEdgeCases.empty,
      output: fn(arrayEdgeCases.empty),
      expectsDefault: fn(arrayEdgeCases.empty) === expectedForEmpty,
    },
    nullish: arrayEdgeCases.nullish.map((v) => ({
      input: v,
      output: fn(v),
      expectsDefault: fn(v) === expectedForEmpty,
    })),
  };
}

/**
 * Assert that function handles null/undefined gracefully
 */
export function assertHandlesNullish(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: (value: any) => any
) {
  const nullResult = fn(null);
  const undefinedResult = fn(undefined);

  // Should not throw
  // Should return a sensible default (not undefined unless that's intentional)
  return {
    handlesNull: nullResult !== undefined,
    handlesUndefined: undefinedResult !== undefined,
    nullResult,
    undefinedResult,
  };
}

/**
 * Assert that function doesn't produce NaN/Infinity
 */
export function assertNoNaNInfinity(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: (value: any) => any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputs: any[]
) {
  const results = inputs.map((input) => {
    const output = fn(input);
    return {
      input,
      output,
      isNaN: typeof output === 'number' && isNaN(output),
      isInfinite: typeof output === 'number' && !isFinite(output),
    };
  });

  const hasNaN = results.some((r) => r.isNaN);
  const hasInfinity = results.some((r) => r.isInfinite);

  return {
    passed: !hasNaN && !hasInfinity,
    hasNaN,
    hasInfinity,
    results,
  };
}

/**
 * Performance test utility
 */
export function measurePerformance(fn: () => void, iterations = 1000) {
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    fn();
  }

  const end = performance.now();
  const totalTime = end - start;
  const avgTime = totalTime / iterations;

  return {
    totalTime: `${totalTime.toFixed(2)}ms`,
    avgTime: `${avgTime.toFixed(4)}ms`,
    iterations,
  };
}

/**
 * Example usage in tests:
 *
 * ```tsx
 * import { testNumericEdgeCases, assertNoNaNInfinity } from '@/lib/test-utils';
 * import { safeParseNumber, safeDivide } from '@/lib';
 *
 * describe('safeParseNumber', () => {
 *   it('handles all numeric edge cases', () => {
 *     const results = testNumericEdgeCases(safeParseNumber, 0);
 *
 *     // All invalid inputs should return default (0)
 *     expect(results.invalid.every(r => r.expectsDefault)).toBe(true);
 *     expect(results.nullish.every(r => r.expectsDefault)).toBe(true);
 *   });
 *
 *   it('never produces NaN', () => {
 *     const result = assertNoNaNInfinity(
 *       safeParseNumber,
 *       [NaN, Infinity, null, undefined, 'abc']
 *     );
 *     expect(result.passed).toBe(true);
 *   });
 * });
 *
 * describe('safeDivide', () => {
 *   it('handles division by zero', () => {
 *     expect(safeDivide(10, 0)).toBe(0);
 *     expect(safeDivide(10, 0, -1)).toBe(-1);
 *   });
 *
 *   it('never produces NaN or Infinity', () => {
 *     const result = assertNoNaNInfinity(
 *       (x) => safeDivide(10, x),
 *       [0, Infinity, -Infinity, NaN, null, undefined]
 *     );
 *     expect(result.passed).toBe(true);
 *   });
 * });
 * ```
 */
