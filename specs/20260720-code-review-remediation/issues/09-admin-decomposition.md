# 09 — Admin dashboard is maintainable

**What to build:** The admin dashboard is split into focused, independently testable components. The admin panel looks and works identically to users — this is a structural change only.

**Blocked by:** 04 (admin error handling — builds on the ErrorBanner component extracted there)

**Status:** complete

- [x] `UserTable` component extracted from the users tab (rows, loading skeleton, empty state, error state)
- [x] `BlobTable` component extracted from the blobs tab
- [x] `FlaggedQueue` component extracted from the flagged tab
- [x] `FeedbackList` component extracted from the feedback tab
- [x] `StorageCards` component extracted from the storage stats section
- [x] `ConfirmModal` component extracted and reusable across all tabs
- [x] Each extracted component is under ~200 lines
- [x] Admin dashboard renders identically to before
- [x] All existing admin functionality works (approve, ban, delete, resolve, refresh)
