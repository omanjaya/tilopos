/**
 * CSV helpers shared by inventory/ingredient exports.
 *
 * `csvCell` quotes values that contain separators/quotes/newlines and neutralises
 * spreadsheet formula injection: any value starting with = + - @ (or a tab/CR,
 * which Excel also treats as a formula lead-in) is prefixed with a single quote.
 */
const FORMULA_LEAD = /^[=+\-@\t\r]/;

export function csvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  // Plain numbers are safe (a negative number is data, not a formula).
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  let text = value;
  if (FORMULA_LEAD.test(text)) {
    text = `'${text}`;
  }
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function csvRow(
  values: ReadonlyArray<string | number | boolean | null | undefined>,
): string {
  return values.map(csvCell).join(',');
}

/** Parses one CSV line (RFC 4180 quoting, no embedded newlines). */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}
