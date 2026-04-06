import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { db, sql } from './client.js';

async function main(): Promise<void> {
  await migrate(db, { migrationsFolder: './migrations' });
  await sql.end();
}

main().catch(async (error) => {
  console.error('Migration failed:', error);
  try {
    await sql.end();
  } catch {
    // ignore shutdown errors
  }
  process.exit(1);
});
