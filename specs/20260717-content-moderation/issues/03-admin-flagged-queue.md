# 03 — Admin flagged review queue

**What to build:** A new "Flagged" section in the admin dashboard where admins can review all blobs awaiting moderation. Each entry shows the thumbnail, title, uploader, upload date, and the raw SightEngine moderation scores. Admins can approve (unflag, blob goes public) or reject (hard delete via existing flow) with one click.

**Blocked by:** #01 — Schema & query filters for flagged blobs, #02 — SightEngine moderation in upload pipeline

**Status:** ready-for-agent

- [ ] New server function to fetch all flagged blobs (`flagged = 1`, `deleted = 0`) with moderation scores
- [ ] New server function to approve a flagged blob (sets `flagged = 0`, clears `moderation_scores`)
- [ ] New server function to reject a flagged blob (calls existing hard-delete flow)
- [ ] Admin dashboard: new "Flagged" tab or section
- [ ] Flagged list UI: thumbnail, title, uploader info, date, moderation scores breakdown per category
- [ ] Approve button with confirmation
- [ ] Reject button with confirmation
- [ ] After approve/reject, item removed from queue (optimistic or refetch)
- [ ] Admin-gated: all new server functions require admin auth
- [ ] Tests for admin server functions (approve, reject, list flagged)
