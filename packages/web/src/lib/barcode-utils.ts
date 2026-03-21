/**
 * Generate a valid EAN-13 barcode string.
 * Uses a prefix of 200 (internal use) followed by 9 random digits + check digit.
 */
export function generateEAN13(): string {
  // Prefix 200 = internal/store use
  let code = '200';
  for (let i = 0; i < 9; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  // Calculate check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = Number(code[i] ?? '0');
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return code + checkDigit.toString();
}
