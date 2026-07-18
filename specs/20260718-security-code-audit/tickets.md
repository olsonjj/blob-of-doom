# Tickets — Security & Code Quality Remediation

**Parent spec:** `implementation-spec.md`  
**Repo:** blob-of-doom

---

## SEC-001 — Prevent admins from modifying other admins

**Priority:** 🔴 Fix Now | **Estimate:** 30m | **Files:** `src/db/admin.func.ts`

### Problem

`setUserBanned` and `setUserApproved` have no check preventing modification of admin users. The UI hides the button but the server function is unprotected — an admin can craft a direct RPC call to ban or un-approve all other admins, locking them out.

### What to do

Add an admin-status check to `setUserBanned` and `setUserApproved` before the update. Query the target user's `isAdmin` field and throw if it's `1`.

```ts
// In both setUserBanned and setUserApproved, after the existing select but before the update:
const [target] = await db
  .select({ isAdmin: profiles.isAdmin })
  .from(profiles)
  .where(eq(profiles.clerkUserId, clerkUserId))
  .limit(1)

if (!target) throw new Error('User not found')
if (target.isAdmin === 1) throw new Error('Cannot modify admin users')
```

### Acceptance criteria

- [ ] `banUser` throws when target is an admin
- [ ] `unbanUser` throws when target is an admin
- [ ] `approveUser` throws when target is an admin
- [ ] `unapproveUser` throws when target is an admin
- [ ] Existing tests for `setUserBanned` / `setUserApproved` still pass
- [ ] New test: `setUserBanned` throws when target is admin

### Rollback

Revert the commit. No data migration.

---

## SEC-002 — Fix static import of server-only auth in profile.func.ts

**Priority:** 🔴 Fix Now | **Estimate:** 15m | **Files:** `src/db/profile.func.ts`

### Problem

`profile.func.ts` uses a top-level static import of `@clerk/tanstack-react-start/server`:

```ts
import { auth } from '@clerk/tanstack-react-start/server'
```

This file is imported by `EnsureProfile.tsx` (a client component), creating a path for server-only Clerk code to leak into the client bundle. Every other DB module uses dynamic `await import(...)`. The codebase's own docs in `auth-guards.func.ts:1-18` explain why static imports of server-only packages are dangerous in TanStack Start.

### What to do

Remove the top-level import. Move it inside the handler as a dynamic import, matching the pattern used by every other DB module.

```ts
// Remove line 2: import { auth } from '@clerk/tanstack-react-start/server'

// Inside the handler:
export const ensureProfile = createServerFn({ method: 'POST' }).handler(async () => {
  const { auth } = await import('@clerk/tanstack-react-start/server')
  const { userId } = await auth()
  // ... rest unchanged
})
```

### Acceptance criteria

- [ ] No static import of `@clerk/tanstack-react-start/server` in `profile.func.ts`
- [ ] `ensureProfile` still works: creates profile on first call, no-op on subsequent
- [ ] `EnsureProfile.tsx` does not pull server-only Clerk code into client bundle
- [ ] Existing tests pass

### Rollback

One-line revert. Worst case if broken: new users can't create profiles.

---

## SEC-003 — Flagged uploads must count toward daily limit

**Priority:** 🔴 Fix Now | **Estimate:** 15m | **Files:** `src/db/upload.func.ts`

### Problem

In `uploadBlob` handler, the upload count increment is gated behind `if (!moderation.flagged)`. A malicious user can intentionally upload flagged content (gore, weapons, etc.) to get unlimited uploads — each one gets flagged, none count toward the limit.

### What to do

Remove the `if (!moderation.flagged)` guard. Always increment the count regardless of moderation outcome. The count increment block (currently inside the `if`) moves to unconditional execution.

```ts
// BEFORE:
if (!moderation.flagged) {
  const [profile] = await db.select()...
  // ... count logic
}

// AFTER: always run the count logic (remove the if wrapper)
const [profile] = await db.select()...
// ... same count logic
```

### Acceptance criteria

- [ ] Upload count increments for flagged uploads
- [ ] Upload count increments for clean uploads (no regression)
- [ ] Admins still bypass the limit (no regression)
- [ ] Existing upload tests pass (update any that assert flagged uploads don't count)

### Rollback

Revert the commit. Users who relied on flagged uploads not counting will hit the limit — this is intentional.

---

## SEC-004 — TOCTOU race condition on upload limit

**Priority:** 🟠 Fix Soon | **Estimate:** 1.5h | **Files:** `src/db/upload.func.ts`

### Problem

`checkUploadLimit` reads the current count, then the handler later increments it — after image processing, moderation, and Vercel Blob upload. Two concurrent requests can both pass the check before either writes, bypassing the daily limit.

### What to do

**Use Option A (increment-first):** Move the count increment to *before* image processing, moderation, and Blob upload. If any subsequent step fails, decrement the count back. This closes the race window without holding a long-lived row lock.

```
1. Check limit (read)
2. Increment count immediately (write) — closes the race
3. Process image, moderate, upload to Blob
4. Insert DB record
5. If any step 3-4 fails, decrement count back
```

### Acceptance criteria

- [ ] Two concurrent upload requests from the same user cannot both succeed
- [ ] Failed uploads (processing error, moderation error, Blob error) do not permanently consume the daily slot
- [ ] Successful uploads count exactly once
- [ ] New test: concurrent upload race condition is prevented

### Rollback

Revert the commit. The race window is narrow (~100ms) so the existing behavior is unlikely to cause immediate issues.

---

## SEC-005 — Moderation must fail closed (quarantine on error)

**Priority:** 🟠 Fix Soon | **Estimate:** 2h | **Files:** `src/db/moderation.func.ts`, `src/routes/upload/index.tsx`

### Problem

When SightEngine is unreachable or returns an API error, `moderateImage` returns `{ flagged: false }`. During a SightEngine outage, all uploads publish directly with no moderation. The comment says "bias toward availability" but this is a content safety risk.

### What to do

**Option A (recommended):** When SightEngine fails, return `{ flagged: true, moderationUnavailable: true }`. The UI shows "Your upload has been queued for review" instead of silently publishing. Admins see a distinct "moderation unavailable" marker in the flagged queue.

Also add `MODERATION_FAIL_OPEN` env var (default `false`) so operators can restore fail-open behavior during extended outages.

### Acceptance criteria

- [ ] SightEngine API errors → `flagged: true`, `moderationUnavailable: true`
- [ ] Network/timeout errors → `flagged: true`, `moderationUnavailable: true`
- [ ] Missing credentials → `flagged: true`, `moderationUnavailable: true` (currently skips silently)
- [ ] `MODERATION_FAIL_OPEN=true` restores old fail-open behavior
- [ ] Admin flagged queue shows "moderation unavailable" vs "flagged by AI" distinction
- [ ] User sees "queued for review" message instead of silent publish
- [ ] New tests: API error → flagged, network error → flagged, missing creds → flagged

### Rollback

Set `MODERATION_FAIL_OPEN=true` to restore old behavior. Monitor SightEngine status after deploy.

---

## SEC-006 — Replace silent catch blocks with error logging

**Priority:** 🟠 Fix Soon | **Estimate:** 1h | **Files:** `src/components/EnsureProfile.tsx`, `src/db/blob-detail.func.ts`, `src/routes/admin/index.tsx`

### Problem

Multiple critical paths have empty `.catch(() => {})` blocks:
- `EnsureProfile.tsx` — profile creation failures are invisible; user later hits "Profile not found"
- `blob-detail.func.ts` — view counts silently lost
- `admin/index.tsx` — `loadStorage`, `loadBlobs`, `loadFlagged` all fail silently; admin sees empty state and assumes no data

### What to do

1. **`EnsureProfile.tsx`** — add `console.error('ensureProfile failed:', err)` to the catch
2. **`blob-detail.func.ts`** — add `console.error('incrementViewCount failed:', err)` to the catch
3. **`admin/index.tsx`** — add error state UI ("Failed to load. [Retry]") for `loadStorage`, `loadBlobs`, `loadFlagged` in addition to `console.error`

### Acceptance criteria

- [ ] All empty `.catch(() => {})` blocks replaced with at least `console.error`
- [ ] Admin panel shows user-visible error state when data loading fails
- [ ] Admin panel has a retry button for failed data loads

### Rollback

Revert the commit. No behavioral change beyond logging and error UI.

---

## SEC-007 — Atomic upsert for ratings (eliminate race condition)

**Priority:** 🟡 Cleanup | **Estimate:** 30m | **Files:** `src/db/rating.func.ts`

### Problem

`upsertRating` does update-then-insert without a transaction. Two concurrent requests from the same user can both see "no rating" and both attempt inserts. The unique index catches the duplicate, but the raw DB error propagates as an unhandled 500.

### What to do

Replace the two-step update/insert with Drizzle's `onConflictDoUpdate`:

```ts
const [upserted] = await db
  .insert(ratings)
  .values({ blobId, raterProfileId, score })
  .onConflictDoUpdate({
    target: [ratings.blobId, ratings.raterProfileId],
    set: { score, updatedAt: new Date() },
  })
  .returning()
```

### Acceptance criteria

- [ ] Single atomic query instead of update + insert
- [ ] No 500 error on concurrent rating submissions from same user
- [ ] Existing rating tests pass

### Rollback

Revert the commit. The unique index prevents data corruption; only the error handling is affected.

---

## SEC-008 — Clean up orphaned Vercel Blob files on upload failure

**Priority:** 🟡 Cleanup | **Estimate:** 45m | **Files:** `src/db/upload.func.ts`

### Problem

Images are uploaded to Vercel Blob before the DB insert. If the insert fails, the Blob files are orphaned with no cleanup — consuming storage and costing money.

### What to do

Track uploaded URLs and attempt best-effort cleanup in a try/catch:

```ts
const uploadedUrls: string[] = []
try {
  // ... upload to Blob, collect URLs
  uploadedUrls.push(thumbResult.url, mediumResult.url, fullResult.url)
  // ... DB insert
} catch (err) {
  if (uploadedUrls.length > 0) {
    const { del } = await import('@vercel/blob')
    del(uploadedUrls, { token, storeId }).catch((cleanupErr) => {
      console.error('Failed to clean up orphaned blobs:', cleanupErr)
    })
  }
  throw err
}
```

### Acceptance criteria

- [ ] Failed uploads attempt to delete already-uploaded Blob files
- [ ] Cleanup failure is logged but does not mask the original error
- [ ] Successful uploads are unaffected

### Rollback

Revert the commit. Orphaned blobs are rare (DB insert is the least likely step to fail).

---

## SEC-009 — Fix removeBlob delete ordering (DB before Blob)

**Priority:** 🟡 Cleanup | **Estimate:** 15m | **Files:** `src/db/admin.func.ts`

### Problem

`removeBlob` calls `del()` (Vercel Blob) before `db.delete()` (DB). If the DB delete fails, you have a DB row pointing to deleted files — a broken reference. The reverse failure mode (orphaned Blob files) is cheaper and easier to clean up.

### What to do

Swap the order: delete from DB first, then from Blob. Log Blob deletion failures but don't throw.

```ts
// BEFORE:
await del([...urls], { token, storeId })
await db.delete(blobs).where(eq(blobs.id, blobId))

// AFTER:
await db.delete(blobs).where(eq(blobs.id, blobId))
await del([...urls], { token, storeId }).catch((err) => {
  console.error('Failed to delete Blob files for blobId:', blobId, err)
})
```

### Acceptance criteria

- [ ] DB row deleted before Blob files
- [ ] Blob deletion failure is logged but does not throw
- [ ] No DB rows pointing to deleted files

### Rollback

Revert the commit. The current failure mode (broken references) is worse than the new one (orphaned files).

---

## SEC-010 — Consistent soft-delete for admin blob removal

**Priority:** 🟡 Cleanup | **Estimate:** 30m | **Files:** `src/db/admin.func.ts`

### Problem

`removeBlob` calls `db.delete()` (permanent hard-delete), while `softDeleteBlobRecord` in `blob-edit.func.ts` sets `deleted: 1` (soft-delete). Admin rejections are irreversible with no undo path. Inconsistent behavior between admin and user deletion paths.

### What to do

Change `removeBlob` to soft-delete (`deleted: 1`) for consistency. The Blob files are still deleted from Vercel Blob (per SEC-009 ordering fix), but the DB row is preserved for audit/recovery.

```ts
// Replace:
await db.delete(blobs).where(eq(blobs.id, blobId))

// With:
await db.update(blobs).set({ deleted: 1 }).where(eq(blobs.id, blobId))
```

### Acceptance criteria

- [ ] `removeBlob` (and `rejectFlaggedBlob` which calls it) uses soft-delete
- [ ] Soft-deleted blobs are excluded from gallery queries (verify existing `deleted: 0` filters)
- [ ] Admin can still see soft-deleted blobs in the admin panel

### Rollback

Revert the commit. No data loss — soft-deleted rows can be hard-deleted later.

---

## SEC-011 — Structured error returns instead of JSON-in-message

**Priority:** 🟡 Cleanup | **Estimate:** 1.5h | **Files:** `src/db/upload.func.ts`, `src/db/blob-edit.func.ts`, `src/routes/upload/index.tsx`, `src/routes/gallery/$blobId/index.tsx`

### Problem

Server functions stuff `JSON.stringify(errors)` into `Error.message`. The client tries `JSON.parse(message)`. Any server error whose message happens to be valid JSON gets mis-parsed as field-level validation errors. Fragile and non-idiomatic.

### What to do

Return structured errors as part of the normal return type instead of throwing:

```ts
// Server side — instead of:
throw new Error(JSON.stringify(errors))
// Return:
return { success: false, errors } as const

// Client side — instead of:
try { JSON.parse(message) } catch { ... }
// Check:
if ('errors' in result && !result.success) { ... }
```

⚠️ **Highest-risk cleanup item.** Changes return types across multiple server functions and client call sites. Do this last in the cleanup tier.

### Acceptance criteria

- [ ] Server functions return structured errors, not JSON-in-message
- [ ] All client call sites updated to handle the new return type
- [ ] No `JSON.parse` of error messages remains in client code
- [ ] TypeScript compilation passes with the new return types

### Rollback

Revert the commit. This is the most invasive change — consider deferring to Tier 4 if the blast radius is too large.

---

## SEC-012 — Restore Drizzle type safety in db Proxy

**Priority:** 🟡 Cleanup | **Estimate:** 30m | **Files:** `src/db/index.ts`

### Problem

The lazy-initialization Proxy casts through `unknown`, discarding Drizzle ORM types:

```ts
return (getDb() as unknown as Record<string | symbol, unknown>)[prop]
```

IDE autocomplete and compile-time query checking are unreliable for schema-specific methods.

### What to do

Replace with a properly typed Proxy factory:

```ts
function createLazyDb(): NeonHttpDatabase<typeof schema> {
  const target = {} as NeonHttpDatabase<typeof schema>
  return new Proxy(target, {
    get(_, prop) {
      const db = getDb()
      return (db as Record<string | symbol, unknown>)[prop]
    },
  })
}

export const db = createLazyDb()
```

### Acceptance criteria

- [ ] No `as unknown as` cast in the Proxy
- [ ] IDE autocomplete for `db.select()`, `db.insert()`, etc. still works
- [ ] IDE autocomplete for schema-specific methods (e.g., `db.query.blobs`) still works
- [ ] TypeScript compilation passes

### Rollback

Revert the commit. The outer type annotation already provides most IDE value.

---

## SEC-013 — Extract shared validation constants

**Priority:** 🟡 Cleanup | **Estimate:** 15m | **Files:** `src/db/upload.func.ts`, `src/routes/upload/index.tsx`, new file `src/shared/constants.ts`

### Problem

`ALLOWED_TYPES` and `MAX_FILE_SIZE` are defined in both `upload.func.ts` (server) and `upload/index.tsx` (client). Change one, forget the other → client/server validation divergence.

### What to do

Create `src/shared/constants.ts`:

```ts
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const
```

Import from both locations. Ensure the shared file has no server-only imports (safe for client bundle).

### Acceptance criteria

- [ ] `ALLOWED_TYPES` and `MAX_FILE_SIZE` defined in exactly one place
- [ ] Both `upload.func.ts` and `upload/index.tsx` import from the shared location
- [ ] No server-only code in the shared constants file
- [ ] Client bundle does not grow unexpectedly

### Rollback

Revert the commit. Duplicated constants are a maintenance issue, not a runtime bug.

---

## SEC-014 — Decompose admin/index.tsx (~700 lines)

**Priority:** 🔵 Defer | **Estimate:** 3h | **Files:** `src/routes/admin/index.tsx`

### Problem

`admin/index.tsx` is ~700 lines. Hard to navigate, review, and test. Merge conflicts are painful.

### What to do

Split into separate components under `src/routes/admin/components/`:
- `UserTable.tsx`
- `BlobTable.tsx`
- `FlaggedQueue.tsx`
- `StorageCards.tsx`
- `ConfirmModal.tsx`

No behavioral changes. Pure extraction refactor.

### Acceptance criteria

- [ ] Each component is under ~200 lines
- [ ] Admin panel functions identically
- [ ] Existing admin tests pass

---

## SEC-015 — Test coverage for untested DB modules

**Priority:** 🔵 Defer | **Estimate:** 4h | **Files:** `src/db/__tests__/`

### Problem

6 of 12 DB modules have no tests: `moderation.func.ts`, `blob-detail.func.ts`, `blob-edit.func.ts`, `auth-guards.func.ts`, `profile.func.ts`, `admin-check.func.ts`.

### What to do

Add tests in priority order:

1. **`moderation.func.ts`** — clean image, flagged image, API error, network error, missing credentials
2. **`auth-guards.func.ts`** — authenticated, unauthenticated, admin, non-admin
3. **`profile.func.ts`** — new user insert, existing user no-op, unauthenticated
4. **`blob-edit.func.ts`** — ownership verification, update, soft-delete
5. **`blob-detail.func.ts`** — view counting, blob retrieval
6. **`admin-check.func.ts`** — admin verification

### Acceptance criteria

- [ ] `moderation.func.ts` has tests for all five scenarios
- [ ] `auth-guards.func.ts` has tests for all four scenarios
- [ ] `profile.func.ts` has tests for all three scenarios
- [ ] Remaining modules have at least happy-path and error-path tests

---

## Dependency Graph

```
SEC-001 (admin guard)     ── independent
SEC-002 (static import)   ── independent
SEC-003 (flagged count)   ── independent
SEC-004 (TOCTOU race)     ── depends on SEC-003 (same file, avoid conflicts)
SEC-005 (moderation)      ── independent
SEC-006 (silent catches)  ── independent
SEC-007 (rating upsert)   ── independent
SEC-008 (orphaned blobs)  ── depends on SEC-004 (same file)
SEC-009 (delete ordering) ── independent
SEC-010 (soft-delete)     ── depends on SEC-009 (same function)
SEC-011 (JSON.parse)      ── independent, do last in cleanup tier
SEC-012 (Proxy types)     ── independent
SEC-013 (shared constants)── independent
SEC-014 (admin decompose) ── independent, defer
SEC-015 (test coverage)   ── independent, defer
```

## Execution Order

```
Wave 1 (parallel):  SEC-001, SEC-002, SEC-003
Wave 2 (parallel):  SEC-004, SEC-005, SEC-006
Wave 3 (sequential): SEC-007 → SEC-008 → SEC-009 → SEC-010
Wave 4 (parallel):  SEC-011, SEC-012, SEC-013
Wave 5 (deferred):  SEC-014, SEC-015
```
