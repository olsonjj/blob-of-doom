# 06 — Content moderation gating is consistent

**What to build:** Users can't rate or inflate view counts on hidden or deleted blobs by guessing their IDs. Deleting a blob from the admin panel does what the UI says it does — code, comments, and UI all tell the same story about whether deletion is recoverable or permanent.

**Blocked by:** 01 (consolidation)

**Status:** in-progress

- [x] Submitting a rating for a deleted or flagged blob returns a "Blob not found" error instead of succeeding
- [x] Incrementing the view count for a deleted or flagged blob is a no-op (the UPDATE's WHERE clause excludes hidden blobs)
- [x] The soft-delete story is consistent: either (a) blob files are preserved and recovery is possible, with UI and comments reflecting that, or (b) the DB row is hard-deleted and the misleading "preserves for audit/recovery" comment is removed
- [x] Admin delete-confirm modal text matches the actual delete behavior
- [x] Test: rating a deleted blob throws
- [x] Test: rating a flagged blob throws
- [x] Test: view count does not increment for hidden blobs
- [x] Existing rating and blob-detail tests pass
