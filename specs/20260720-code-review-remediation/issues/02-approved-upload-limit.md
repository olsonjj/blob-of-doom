# 02 — Approved users get their promised upload limit

**What to build:** When an admin approves a user, that user can upload 10 blobs per day instead of 1. Unapproved users stay at 1/day. The admin UI confirm modal text ("This user will be allowed up to 10 uploads per day") already matches this behavior — the server just needs to enforce it.

**Blocked by:** 01 (consolidation)

**Status:** ready-for-agent

- [x] `checkUploadLimit()` reads `profile.approved` and grants 10/day for approved users, 1/day for unapproved
- [x] Admins still bypass the limit entirely (no regression)
- [x] Banned users are still blocked from uploading (no regression)
- [x] Admin UI confirm modal text for approve/unapprove matches the actual server behavior
- [x] Test: approved user can upload 10 times in one day
- [x] Test: unapproved user is limited to 1/day
- [x] Test: admin bypass still works
