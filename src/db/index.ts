import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import * as schema from './schema'

/**
 * Lazy-initialized database connection.
 *
 * Module-level process.env reads are unsafe in TanStack Start — they can
 * leak to the client bundle AND evaluate to undefined in edge/serverless
 * runtimes where env is injected per-request. This getter defers the read
 * until the first actual query.
 */
let _db: NeonHttpDatabase<typeof schema> | null = null

function getDb(): NeonHttpDatabase<typeof schema> {
  if (!_db) {
    const sql = neon(process.env.DATABASE_URL!)
    _db = drizzle(sql, { schema })
  }
  return _db
}

/**
 * Drop-in replacement for the old `db` export.
 * Every query goes through the getter so DATABASE_URL is read lazily.
 */
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
