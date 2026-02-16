// This file runs BEFORE any test file imports, ensuring DATABASE_URL
// has connection_limit set before PrismaService reads it.
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('connection_limit')) {
  const separator = process.env.DATABASE_URL.includes('?') ? '&' : '?';
  process.env.DATABASE_URL += `${separator}connection_limit=5`;
}
