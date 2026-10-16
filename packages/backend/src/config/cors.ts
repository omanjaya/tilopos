/** Explicit origins shared by CORS and cookie-session CSRF checks. */
export function corsOrigins(origin: string | undefined, nodeEnv: string | undefined): string[] {
  return (origin || (nodeEnv === 'production' ? '' : 'http://localhost:5173'))
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}
