# 02 — Admin review end-to-end

**What to build:** The site owner can see all feedback submissions in the admin dashboard, mark them as resolved, and delete spam.

**Blocked by:** 01 — Submit feedback end-to-end

**Status:** ready-for-agent

- [ ] `getFeedback` server function: admin-only, returns all feedback ordered by `createdAt` descending.
- [ ] `resolveFeedback` server function: admin-only, toggles `resolved` between 0 and 1 for a given feedback ID.
- [ ] `deleteFeedback` server function: admin-only, permanently deletes a feedback row by ID.
- [ ] "Feedback" tab in admin dashboard: alongside Users/Blobs/Flagged tabs. Tab badge shows unresolved count. Lazy-loaded on first visit. Single list: unresolved first (highlighted), resolved below (dimmed). Each row shows category badge, message, email/submitter, date. Resolve toggle and Delete button (with confirmation modal, reusing existing `ConfirmModal`). Empty state and error state with retry.
- [ ] Tests for `getFeedback`, `resolveFeedback`, `deleteFeedback`: returns ordered rows, toggles resolved both directions, deletes row, handles non-existent ID.
