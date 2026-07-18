# SEC-010 — Consistent soft-delete for admin blob removal

**Priority:** 🟡 Cleanup | **Estimate:** 30m | **Files:** `src/db/admin.func.ts`
**Wave:** 3

## Problem

`removeBlob` calls `db.delete()` (permanent hard-delete), while `softDeleteBlobRecord` in `blob-edit.func.ts` sets `deleted: 1` (soft-delete). Admin rejections are irreversible with no undo path. Inconsistent behavior between admin and user deletion paths.

## What to do

Change `removeBlob` to soft-delete (`deleted: 1`) for consistency. The Blob files are still deleted from Vercel Blob (per SEC-009 ordering fix), but the DB row is preserved for audit/recovery.

```ts
// Replace:
await db.delete(blobs).where(eq(blobs.id, blobId))

// With:
await db.update(blobs).set({ deleted: 1 }).where(eq(blobs.id, blobId))
```

## Acceptance criteria

- [ ] `removeBlob` (and `rejectFlaggedBlob` which calls it) uses soft-delete
- [ ] Soft-deleted blobs are excluded from gallery queries (verify existing `deleted: 0` filters)
- [ ] Admin can still see soft-deleted blobs in the admin panel

## Rollback

Revert the commit. No data loss — soft-deleted rows can be hard-deleted later.
