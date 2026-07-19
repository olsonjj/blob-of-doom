# 08 — Database queries stay fast as the gallery grows

**What to build:** Gallery listings, detail views, admin queries, and upload rate-limit checks all use database indexes instead of sequential scans. No user-visible change — same results, faster query plans.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Index on `blobs.uploader_profile_id` (used in joins with profiles)
- [ ] Index on `blobs.created_at` (used in ORDER BY for gallery and admin)
- [ ] Partial index on `blobs.deleted` WHERE `deleted = 0` (filtered in every visible-blob query)
- [ ] Partial index on `blobs.flagged` WHERE `flagged = 0` (filtered in every visible-blob query)
- [ ] Index on `profiles.last_upload_date` (used in rate-limit check on every upload)
- [ ] Migration is generated and reversible
- [ ] All existing queries return identical results
- [ ] Existing tests pass
