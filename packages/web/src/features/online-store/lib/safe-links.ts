/** Only https URLs from tenant data may become links (blocks javascript: etc.). */
export function safeHttpsUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    // intentionally ignored: not a valid absolute URL, so it is not rendered as a link
    return null;
  }
}

/** wa.me link from a phone number (digits only). */
export function whatsappUrl(value: string | undefined): string | null {
  const digits = (value ?? '').replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : null;
}
