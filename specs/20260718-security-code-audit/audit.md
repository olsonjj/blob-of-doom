# Security & Code Quality Audit

**Date:** 2025-07-18  
**Scope:** Full codebase — `src/`, `scripts/`, config, and infrastructure  
**Method:** Parallel sub-agent review (security + code quality)

---

## 🔴 CRITICAL

_None identified._

---

## 🟠 HIGH

### 1. Race condition: upload limit bypass (TOCTOU)

**`src/db/upload.func.ts:107-130` + `:200-213`**

`checkUploadLimit` reads the current count, then the handler later increments it — after image processing, moderation, and Vercel Blob upload. Two concurrent requests both pass the check before either writes. Fix: use `SELECT ... FOR UPDATE` or a serializable transaction.

### 2. Flagged uploads don't count toward daily limit

**`src/db/upload.func.ts:200`** — `if (!moderation.flagged)` skips the count increment. A malicious user can intentionally upload flagged content to get unlimited uploads.

### 3. Admins can ban other admins (privilege escalation via direct RPC)

**`src/db/admin.func.ts:117-123`** — `setUserBanned` has no check preventing banning of admin users. The UI hides the button (`admin/index.tsx:260`) but the server function is unprotected. An admin could craft a direct RPC call to lock out all other admins.

### 4. `profile.func.ts` uses top-level import of server-only `auth`

**`src/db/profile.func.ts:2`** — `import { auth } from '@clerk/tanstack-react-start/server'` is a static import. Every other DB file uses dynamic `await import(...)`. This file is imported by `EnsureProfile.tsx` (a client component), creating a path for server-only code to leak to the client bundle. The codebase's own docs in `auth-guards.func.ts:1-18` explain why this is dangerous.

---

## 🟡 MEDIUM

### 5. Race condition in `upsertRating` — no transaction

**`src/db/rating.func.ts:68-87`** — Update-then-insert without a transaction. Concurrent requests from the same user can both see "no rating" and both attempt inserts. The unique index catches it, but the raw DB error propagates as an unhandled 500.

### 6. Orphaned Vercel Blob files on upload failure

**`src/db/upload.func.ts:148-186`** — Images are uploaded to Vercel Blob before the DB insert. If the insert fails, the files are orphaned with no cleanup.

### 7. `removeBlob` deletes from Vercel Blob before DB

**`src/db/admin.func.ts:120-127`** — `del()` runs before `db.delete()`. If DB delete fails, you have a DB row pointing to deleted files. Reverse the order or wrap in a transaction.

### 8. Admin hard-deletes vs user soft-deletes — inconsistent

**`src/db/admin.func.ts:120-127`** — `removeBlob` calls `db.delete()` (permanent), while `softDeleteBlobRecord` in `blob-edit.func.ts` sets `deleted: 1`. Admin rejections are irreversible with no undo path.

### 9. Moderation fails open — all content passes when SightEngine is down

**`src/db/moderation.func.ts:60-63, 88-91`** — Both API errors and network failures return `{ flagged: false }`. During a SightEngine outage, all uploads publish directly. Consider quarantining (flagging) uploads when moderation is unavailable.

### 10. `JSON.parse` error propagation is fragile

**`src/routes/upload/index.tsx:130-139`, `src/routes/gallery/$blobId/index.tsx:140-150`** — Server functions stuff `JSON.stringify(errors)` into `Error.message`. The client tries `JSON.parse(message)`. Any server error whose message happens to be valid JSON gets mis-parsed as field-level validation errors.

### 11. Silent failures in multiple critical paths

- **`EnsureProfile.tsx:15`** — `ensureProfile().catch(() => {})` — profile creation failures are invisible; user later hits "Profile not found"
- **`blob-detail.func.ts:80`** — `incrementViewCount().catch(() => {})` — view counts silently lost
- **`admin/index.tsx`** — `loadStorage`, `loadBlobs`, `loadFlagged` all have empty `catch` blocks

### 12. `db/index.ts` Proxy loses Drizzle type safety

**`src/db/index.ts:28-31`** — `(getDb() as unknown as Record<string | symbol, unknown>)[prop]` casts through `unknown`, discarding Drizzle ORM types. IDE autocomplete and compile-time query checking are unreliable.

### 13. `admin/index.tsx` is ~700 lines — needs decomposition

Split into separate files: `UserTable`, `BlobTable`, `FlaggedQueue`, `StorageCards`, `ConfirmModal`.

### 14. Missing test coverage for 6 of 12 DB modules

No tests for: `moderation.func.ts`, `blob-detail.func.ts`, `blob-edit.func.ts`, `auth-guards.func.ts`, `profile.func.ts`, `admin-check.func.ts`. Existing tests only cover extracted helpers, not full server function handlers.

### 15. Validation constants duplicated between client and server

**`src/db/upload.func.ts:12-13`** and **`src/routes/upload/index.tsx:18-19`** — `ALLOWED_TYPES` and `MAX_FILE_SIZE` defined in both places. Change one, forget the other → client/server validation divergence.

---

## ✅ What's Solid

- **Auth**: All mutations check auth; admin functions check `isAdmin`; blob edits verify ownership; banned users blocked from rating/uploading
- **Input validation**: All server functions use `.validator()`; Drizzle ORM parameterized queries prevent SQL injection; React auto-escapes prevents XSS
- **Architecture**: `createServerFn` pattern with dynamic imports for server-only code; lazy DB init via Proxy; Clerk + TanStack Start auth guard pattern is correct
- **Image processing**: Three WebP variants in parallel via `Promise.all`
- **Query design**: Single-query aggregates with LEFT JOIN + GROUP BY avoid N+1; Clerk user enrichment is batched
- **TypeScript**: `strict: true` with `noUnusedLocals`/`noUnusedParameters`
- **Tests**: 71 passing; well-structured with `vi.hoisted()` mocks and good edge case coverage for covered modules
- **Secrets**: `.env.local` properly excluded from git via `*.local` in `.gitignore`; `.env.example` tracked with placeholders
