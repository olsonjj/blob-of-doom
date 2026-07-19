# 01 — Codebase consolidation (prefactor)

**What to build:** All server functions use the same DB access pattern, the same admin guard, and the same input validation approach. No user-visible behavior changes — this is pure refactor that makes every subsequent ticket simpler and ensures fixes propagate everywhere.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] All modules use the lazy `db` Proxy from `src/db/index.ts` — no more `getDb()`/`getSchema()`/`getDrizzleEq()` ceremony or inline dynamic imports for DB access
- [x] A single `requireAdmin()` (throws, for server functions) and `checkIsAdmin()` (returns boolean, for route guards) live in `auth-guards.func.ts` — duplicates in `admin.func.ts` and `feedback.func.ts` are removed
- [x] Input validation uses a shared helper or lightweight schema approach instead of copy-pasted `typeof` blocks across `upload.func.ts`, `rating.func.ts`, `feedback.func.ts`, `admin.func.ts`, and `blob-edit.func.ts`
- [x] `rows as unknown as T` double-casts are replaced with proper Drizzle type inference or explicit column type annotations — no cast should hide a mismatch that `.toFixed()` later exposes
- [x] All existing tests pass with zero changes to test assertions (behavior is preserved)
- [x] Build succeeds with no new lint or typecheck errors
