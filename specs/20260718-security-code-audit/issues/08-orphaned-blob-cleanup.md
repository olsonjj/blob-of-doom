# SEC-008 — Clean up orphaned Vercel Blob files on upload failure

**Priority:** 🟡 Cleanup | **Estimate:** 45m | **Files:** `src/db/upload.func.ts`
**Wave:** 3

## Problem

Images are uploaded to Vercel Blob before the DB insert. If the insert fails, the Blob files are orphaned with no cleanup — consuming storage and costing money.

## What to do

Track uploaded URLs and attempt best-effort cleanup in a try/catch:

```ts
const uploadedUrls: string[] = [];
try {
  // ... upload to Blob, collect URLs
  uploadedUrls.push(thumbResult.url, mediumResult.url, fullResult.url);
  // ... DB insert
} catch (err) {
  if (uploadedUrls.length > 0) {
    const { del } = await import('@vercel/blob');
    del(uploadedUrls, { token, storeId }).catch((cleanupErr) => {
      console.error('Failed to clean up orphaned blobs:', cleanupErr);
    });
  }
  throw err;
}
```

## Acceptance criteria

- [ ] Failed uploads attempt to delete already-uploaded Blob files
- [ ] Cleanup failure is logged but does not mask the original error
- [ ] Successful uploads are unaffected

## Rollback

Revert the commit. Orphaned blobs are rare (DB insert is the least likely step to fail).
