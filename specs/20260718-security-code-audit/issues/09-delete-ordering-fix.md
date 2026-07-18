# SEC-009 — Fix removeBlob delete ordering (DB before Blob)

**Priority:** 🟡 Cleanup | **Estimate:** 15m | **Files:** `src/db/admin.func.ts`
**Wave:** 3

## Problem

`removeBlob` calls `del()` (Vercel Blob) before `db.delete()` (DB). If the DB delete fails, you have a DB row pointing to deleted files — a broken reference. The reverse failure mode (orphaned Blob files) is cheaper and easier to clean up.

## What to do

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

## Acceptance criteria

- [ ] DB row deleted before Blob files
- [ ] Blob deletion failure is logged but does not throw
- [ ] No DB rows pointing to deleted files

## Rollback

Revert the commit. The current failure mode (broken references) is worse than the new one (orphaned files).
