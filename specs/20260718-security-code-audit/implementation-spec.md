# Implementation Spec — Security & Code Quality Remediation

**Based on:** `audit.md` (2025-07-18)  
**Status:** Aligned — ready for implementation  
**Priority tiers:** Fix Now → Fix Soon → Cleanup → Defer

---

## Tier 1: Fix Now

Trivial fixes with clear exploit paths or codebase policy violations.

---

### 1.1 — Prevent admins from banning/approving other admins

**Audit ref:** HIGH #3  
**Files:** `src/db/admin.func.ts`

**Change:** Add an admin-status check to `setUserBanned` and `setUserApproved` before mutating the target user.

```ts
// In setUserBanned and setUserApproved, after the existing select but before the update:
const [target] = await db
  .select({ isAdmin: profiles.isAdmin })
  .from(profiles)
  .where(eq(profiles.clerkUserId, clerkUserId))
  .limit(1)

if (!target) throw new Error('User not found')
if (target.isAdmin === 1) throw new Error('Cannot modify admin users')
```

**Also:** Add the same guard to `removeBlob` — an admin should not be able to delete another admin's blob without additional safeguards. For now, add a check that the blob's uploader is not an admin, or skip this if it complicates the flagged-blob rejection flow (admins need to reject flagged blobs from anyone).

**Acceptance criteria:**
- [ ] `banUser` server function throws when target `clerkUserId` belongs to an admin
- [ ] `unbanUser` server function throws when target `clerkUserId` belongs to an admin
- [ ] `approveUser` server function throws when target `clerkUserId` belongs to an admin
- [ ] `unapproveUser` server function throws when target `clerkUserId` belongs to an admin
- [ ] Existing tests for `setUserBanned` / `setUserApproved` still pass
- [ ] New test: banning an admin throws

---

### 1.2 — Fix static import of server-only `auth` in `profile.func.ts`

**Audit ref:** HIGH #4  
**Files:** `src/db/profile.func.ts`

**Change:** Replace the top-level static import with a dynamic import inside the handler, matching the pattern used by every other DB module and documented in `auth-guards.func.ts`.

```ts
// BEFORE (line 2):
import { auth } from '@clerk/tanstack-react-start/server'

// AFTER — remove the top-level import, move inside handler:
export const ensureProfile = createServerFn({ method: 'POST' }).handler(async () => {
  const { auth } = await import('@clerk/tanstack-react-start/server')
  const { userId } = await auth()
  // ... rest unchanged
})
```

**Acceptance criteria:**
- [ ] No static import of `@clerk/tanstack-react-start/server` in `profile.func.ts`
- [ ] `ensureProfile` still works correctly (profile created on first call, no-op on subsequent)
- [ ] `EnsureProfile.tsx` client component does not pull server-only Clerk code into the client bundle (verify via build analysis or manual bundle inspection)
- [ ] Existing tests pass

---

### 1.3 — Flagged uploads count toward daily limit

**Audit ref:** HIGH #2  
**Files:** `src/db/upload.func.ts`

**Change:** Remove the `if (!moderation.flagged)` guard so the upload count always increments regardless of moderation outcome.

```ts
// BEFORE (line ~200):
if (!moderation.flagged) {
  // ... count increment logic
}

// AFTER: always increment
const [profile] = await db
  .select()
  .from(profiles)
  .where(eq(profiles.clerkUserId, userId))
  .limit(1)

const newCount =
  profile && profile.lastUploadDate === today
    ? profile.uploadCountToday + 1
    : 1

await db
  .update(profiles)
  .set({ uploadCountToday: newCount, lastUploadDate: today })
  .where(eq(profiles.clerkUserId, userId))
```

**Acceptance criteria:**
- [ ] Upload count increments for flagged uploads
- [ ] Upload count increments for clean uploads (no regression)
- [ ] Admins still bypass the limit (no regression)
- [ ] Existing upload tests pass (update any that assert flagged uploads don't count)

---

## Tier 2: Fix Soon

Real issues requiring design discussion or with narrower exploit windows.

---

### 2.1 — TOCTOU race condition on upload limit

**Audit ref:** HIGH #1  
**Files:** `src/db/upload.func.ts`

**Decision needed:** Choose an approach.

**Option A — Increment-first (recommended):** Move the count increment to *before* image processing, moderation, and Blob upload. If any subsequent step fails, decrement the count. This avoids long-held row locks.

```ts
// Pseudocode:
// 1. Check limit (read)
// 2. Increment count immediately (write) — closes the race window
// 3. Process image, moderate, upload to Blob
// 4. Insert DB record
// 5. If any step 3-4 fails, decrement count back
```

**Option B — `SELECT ... FOR UPDATE`:** Lock the profiles row for the duration. Simpler code but holds a row lock through external API calls (SightEngine, Vercel Blob) — potentially seconds.

**Option C — DB-level constraint:** Add a unique constraint on `(clerkUserId, lastUploadDate)` and rely on the DB to reject duplicates. Requires schema migration.

**Recommendation:** Option A. It's the least invasive, avoids lock contention, and the decrement-on-failure path is straightforward.

**Acceptance criteria:**
- [ ] Two concurrent upload requests from the same user cannot both succeed
- [ ] Failed uploads (processing error, moderation error, Blob error) do not permanently consume the daily slot
- [ ] Successful uploads count exactly once
- [ ] New test: concurrent upload race condition is prevented

---

### 2.2 — Moderation fail-open behavior

**Audit ref:** MEDIUM #9  
**Files:** `src/db/moderation.func.ts`

**Decision needed:** Choose a failure mode.

**Option A — Quarantine on failure (recommended):** When SightEngine is unreachable or returns an error, flag the upload and include a `moderationStatus: 'unavailable'` marker. The UI shows a warning to the user. Admins can review in the flagged queue.

**Option B — Keep fail-open, add logging:** Leave current behavior but add structured logging (e.g., `console.warn` with a distinct marker) so operations can monitor moderation availability.

**Option C — Configurable:** Add an env var `MODERATION_FAIL_CLOSED=true` to let operators choose.

**Recommendation:** Option A for safety, with Option C as a fast-follow so operators can tune behavior.

**Acceptance criteria:**
- [ ] SightEngine API errors result in `flagged: true` (or configurable behavior)
- [ ] Network/timeout errors result in `flagged: true` (or configurable behavior)
- [ ] `moderationScores` includes a `moderationUnavailable: true` marker so the UI can distinguish "flagged by AI" from "flagged because moderation was down"
- [ ] Admin flagged queue shows the distinction
- [ ] User sees a message: "Your upload has been queued for review" instead of silent publishing
- [ ] New tests: moderation failure returns flagged, moderation timeout returns flagged

---

### 2.3 — Silent failure logging

**Audit ref:** MEDIUM #11  
**Files:** `src/components/EnsureProfile.tsx`, `src/db/blob-detail.func.ts`, `src/routes/admin/index.tsx`

**Change:** Replace all empty `.catch(() => {})` blocks with at minimum `console.error(...)`. For admin panel data loading failures, add user-visible error states.

**Per-file changes:**

- **`EnsureProfile.tsx:15`** — `ensureProfile().catch((err) => { console.error('ensureProfile failed:', err) })`
- **`blob-detail.func.ts:80`** — `incrementViewCount().catch((err) => { console.error('incrementViewCount failed:', err) })`
- **`admin/index.tsx`** — `loadStorage`, `loadBlobs`, `loadFlagged` — add error state to UI (e.g., "Failed to load. [Retry]") in addition to `console.error`

**Acceptance criteria:**
- [ ] All empty `.catch(() => {})` blocks replaced with at least `console.error`
- [ ] Admin panel shows user-visible error state when data loading fails (not silent empty state)
- [ ] Admin panel has a retry mechanism for failed data loads

---

## Tier 3: Cleanup

Real issues with lower blast radius. Fix opportunistically.

---

### 3.1 — `upsertRating` race condition

**Audit ref:** MEDIUM #5  
**Files:** `src/db/rating.func.ts`

**Change:** Replace the update-then-insert pattern with Drizzle's `onConflictDoUpdate` for an atomic upsert.

```ts
// Replace the two-step update/insert with:
const [upserted] = await db
  .insert(ratings)
  .values({ blobId, raterProfileId, score })
  .onConflictDoUpdate({
    target: [ratings.blobId, ratings.raterProfileId],
    set: { score, updatedAt: new Date() },
  })
  .returning()
```

**Acceptance criteria:**
- [ ] Single atomic query instead of update + insert
- [ ] No 500 error on concurrent rating submissions from same user
- [ ] Existing rating tests pass

---

### 3.2 — Orphaned Vercel Blob files on upload failure

**Audit ref:** MEDIUM #6  
**Files:** `src/db/upload.func.ts`

**Change:** Track uploaded blob URLs and attempt cleanup on failure. Best-effort — log if cleanup fails.

```ts
const uploadedUrls: string[] = []
try {
  // ... upload to Blob, collect URLs
  uploadedUrls.push(thumbResult.url, mediumResult.url, fullResult.url)
  // ... DB insert
} catch (err) {
  // Best-effort cleanup
  if (uploadedUrls.length > 0) {
    const { del } = await import('@vercel/blob')
    del(uploadedUrls, { token, storeId }).catch((cleanupErr) => {
      console.error('Failed to clean up orphaned blobs:', cleanupErr)
    })
  }
  throw err
}
```

**Acceptance criteria:**
- [ ] Failed uploads attempt to delete already-uploaded Blob files
- [ ] Cleanup failure is logged but does not mask the original error
- [ ] Successful uploads are unaffected

---

### 3.3 — `removeBlob` delete ordering

**Audit ref:** MEDIUM #7  
**Files:** `src/db/admin.func.ts`

**Change:** Swap the order — delete from DB first, then from Vercel Blob. If Blob delete fails, log the error but don't roll back (the DB row is already gone, which is the safer failure mode).

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

**Acceptance criteria:**
- [ ] DB row deleted before Blob files
- [ ] Blob deletion failure is logged but does not throw
- [ ] No DB rows pointing to deleted files (the worse failure mode is eliminated)

---

### 3.4 — Admin hard-delete vs user soft-delete consistency

**Audit ref:** MEDIUM #8  
**Files:** `src/db/admin.func.ts`, `src/db/blob-edit.func.ts`

**Decision needed:** Should admin deletion be soft or hard?

**Recommendation:** Change `removeBlob` to soft-delete (set `deleted: 1`) for consistency. Add a separate `purgeBlob` server function for permanent deletion if needed later. This gives admins an undo path and matches user-facing behavior.

**Change:** Replace `db.delete(blobs)` in `removeBlob` with `db.update(blobs).set({ deleted: 1 })`.

**Acceptance criteria:**
- [ ] `removeBlob` (and `rejectFlaggedBlob` which calls it) uses soft-delete
- [ ] Soft-deleted blobs are excluded from gallery queries (verify existing `deleted: 0` filters)
- [ ] Admin can still see soft-deleted blobs in the admin panel (or a separate "deleted" view)

---

### 3.5 — `JSON.parse` error propagation

**Audit ref:** MEDIUM #10  
**Files:** `src/db/upload.func.ts`, `src/db/blob-edit.func.ts`, `src/routes/upload/index.tsx`, `src/routes/gallery/$blobId/index.tsx`

**Change:** Use a structured return type instead of stuffing JSON in `Error.message`. Server functions return `{ success: false, errors }` as part of their normal return type.

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

**Note:** This changes the return type of the server functions. All callers must be updated. This is the most invasive cleanup item — consider deferring if the blast radius is too large.

**Acceptance criteria:**
- [ ] Server functions return structured errors, not JSON-in-message
- [ ] All client call sites updated to handle the new return type
- [ ] No `JSON.parse` of error messages remains in client code
- [ ] TypeScript compilation passes with the new return types

---

### 3.6 — Drizzle type safety in Proxy

**Audit ref:** MEDIUM #12  
**Files:** `src/db/index.ts`

**Change:** Replace the `as unknown as` cast with a properly typed Proxy that preserves the generic type parameter.

```ts
// A typed Proxy that preserves NeonHttpDatabase<typeof schema>
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

**Note:** The outer type annotation `NeonHttpDatabase<typeof schema>` already provides most of the IDE value. This change is primarily for correctness. Verify that Drizzle's query builder types still flow through after the change.

**Acceptance criteria:**
- [ ] No `as unknown as` cast in the Proxy
- [ ] IDE autocomplete for `db.select()`, `db.insert()`, etc. still works
- [ ] IDE autocomplete for schema-specific methods (e.g., `db.query.blobs`) still works
- [ ] TypeScript compilation passes

---

### 3.7 — Extract shared validation constants

**Audit ref:** MEDIUM #15  
**Files:** `src/db/upload.func.ts`, `src/routes/upload/index.tsx`

**Change:** Create `src/shared/constants.ts` (or similar) with `ALLOWED_TYPES` and `MAX_FILE_SIZE`. Import from both locations. Ensure the shared file is safe for both client and server bundles (no server-only imports).

```ts
// src/shared/constants.ts
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const
```

**Acceptance criteria:**
- [ ] `ALLOWED_TYPES` and `MAX_FILE_SIZE` defined in exactly one place
- [ ] Both `upload.func.ts` and `upload/index.tsx` import from the shared location
- [ ] No server-only code in the shared constants file
- [ ] Client bundle does not grow unexpectedly

---

## Tier 4: Defer

Important but not urgent. Schedule for dedicated effort.

---

### 4.1 — `admin/index.tsx` decomposition

**Audit ref:** MEDIUM #13  
**Files:** `src/routes/admin/index.tsx`

**Plan:** Split into:
- `src/routes/admin/components/UserTable.tsx`
- `src/routes/admin/components/BlobTable.tsx`
- `src/routes/admin/components/FlaggedQueue.tsx`
- `src/routes/admin/components/StorageCards.tsx`
- `src/routes/admin/components/ConfirmModal.tsx`

**Acceptance criteria:**
- [ ] Each component is under ~200 lines
- [ ] No behavioral changes — admin panel functions identically
- [ ] Existing admin tests pass

---

### 4.2 — Test coverage for untested DB modules

**Audit ref:** MEDIUM #14  
**Files:** `src/db/moderation.func.ts`, `src/db/blob-detail.func.ts`, `src/db/blob-edit.func.ts`, `src/db/auth-guards.func.ts`, `src/db/profile.func.ts`, `src/db/admin-check.func.ts`

**Priority order:**
1. `moderation.func.ts` — fail-open behavior is security-sensitive
2. `auth-guards.func.ts` — auth bypass would be catastrophic
3. `profile.func.ts` — after the static import fix (1.2), verify no regression
4. `blob-edit.func.ts` — ownership verification
5. `blob-detail.func.ts` — view counting, blob retrieval
6. `admin-check.func.ts` — admin verification

**Acceptance criteria:**
- [ ] `moderation.func.ts` has tests for: clean image, flagged image, API error, network error, missing credentials
- [ ] `auth-guards.func.ts` has tests for: authenticated user, unauthenticated user, admin user, non-admin user
- [ ] `profile.func.ts` has tests for: new user (insert), existing user (no-op), unauthenticated
- [ ] Remaining modules have at least happy-path and error-path tests

---

## Implementation Order

1. **Tier 1** (1.1, 1.2, 1.3) — all three are independent, can be done in any order
2. **Tier 2** (2.1, 2.2, 2.3) — 2.1 and 2.2 are independent; 2.3 can be done anytime
3. **Tier 3** (3.1–3.7) — all independent, pick off as time allows
4. **Tier 4** (4.1, 4.2) — schedule for a dedicated cleanup sprint

---

## Rollback / Risk Notes

- **1.2 (static import fix):** If the dynamic import breaks `ensureProfile`, the worst case is new users can't create profiles. Rollback is a one-line revert.
- **1.3 (flagged uploads count):** Users who relied on flagged uploads not counting will hit the limit. This is intentional — it closes the exploit.
- **2.2 (moderation fail-closed):** If SightEngine has an outage, all uploads get quarantined. Monitor SightEngine status closely after deploying. Have a rollback plan (env var to restore fail-open).
- **3.5 (JSON.parse refactor):** Highest risk of regression due to changed return types across multiple client call sites. Consider doing this last in Tier 3, or deferring to Tier 4.
