const { execSync } = require('child_process');

/**
 * Global setup: clean idle database connections before test suite starts.
 * This prevents "too many clients" errors from leftover --forceExit runs.
 */
module.exports = async function globalSetup() {
  try {
    execSync(
      `psql "postgresql://tilopos:tilopos_dev@localhost:5432/tilopos" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'tilopos' AND pid <> pg_backend_pid() AND state = 'idle';" 2>/dev/null`,
      { stdio: 'ignore' },
    );
  } catch {
    // Ignore — psql may not be available
  }

  // Set connection_limit for Prisma
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('connection_limit')) {
    const separator = process.env.DATABASE_URL.includes('?') ? '&' : '?';
    process.env.DATABASE_URL += `${separator}connection_limit=10`;
  }
};
