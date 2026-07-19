# 04 — Admin dashboard survives fetch failures

**What to build:** When any admin data fetch fails (users, blobs, flagged, feedback, storage stats), the dashboard shows a readable error message with a retry button instead of crashing with a blank white screen.

**Blocked by:** 01 (consolidation)

**Status:** complete

- [x] All five SWR error renders in the admin dashboard show `error.message` (or a fallback string) instead of the raw Error object
- [x] Each error state includes a working retry button
- [x] Error banner styling is consistent across all four tabs and the storage section
- [x] A shared `ErrorBanner` component is extracted rather than copy-pasting the error-rendering pattern five times
- [x] Existing admin dashboard behavior is unchanged when fetches succeed
