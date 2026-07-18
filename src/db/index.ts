import { neon } from '@neondatabase/serverless';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from './schema';

/**
 * Lazy-initialized database connection.
 *
 * Module-level process.env reads are unsafe in TanStack Start — they can
 * leak to the client bundle AND evaluate to undefined in edge/serverless
 * runtimes where env is injected per-request. This getter defers the read
 * until the first actual query.
 */
let dbInstance: NeonHttpDatabase<typeof schema> | null = null;

function getDb(): NeonHttpDatabase<typeof schema> {
  if (!dbInstance) {
    const sql = neon(process.env.DATABASE_URL!);
    dbInstance = drizzle(sql, { schema });
  }
  return dbInstance;
}

/**
 * Typed Proxy that preserves Drizzle ORM types while deferring initialization.
 * Every property access lazily creates the real DB connection on first use.
 */
function createLazyDb(): NeonHttpDatabase<typeof schema> {
  const target = {} as NeonHttpDatabase<typeof schema>;
  return new Proxy(target, {
    get(_, prop) {
      const realDb = getDb();
      return Reflect.get(realDb, prop);
    },
  });
}

export const db = createLazyDb();
