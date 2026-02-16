import { execSync } from 'child_process';

/**
 * Global setup: clean idle database connections before test suite starts.
 * This prevents "too many clients" errors from leftover --forceExit runs.
 */
export default async function globalSetup() {
  try {
    const dbUrl =
      process.env.DATABASE_URL ||
      'postgresql://tilopos:tilopos_dev@localhost:5432/tilopos';
    execSync(
      `psql "${dbUrl}" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'tilopos' AND pid <> pg_backend_pid() AND state = 'idle';" 2>/dev/null`,
      { stdio: 'ignore' },
    );
  } catch {
    // Ignore — psql may not be available
  }
}
