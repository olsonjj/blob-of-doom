# 03 — Upload rate limiting can't be raced

**What to build:** Two simultaneous upload requests from the same user can't both sneak past the daily cap. If image processing, moderation, or blob storage fails mid-upload, the daily slot is returned to the user rather than permanently consumed.

**Blocked by:** 01 (consolidation)

**Status:** ready-for-agent

- [x] Daily upload count uses an atomic increment (`SET upload_count_today = upload_count_today + 1`) instead of SELECT-then-UPDATE
- [x] Concurrent requests from the same user cannot both succeed when only one slot remains
- [x] If upload fails after the count is incremented (processing error, moderation error, blob storage error), the count is rolled back so the daily slot is not permanently consumed
- [x] Successful uploads count exactly once
- [x] Test: two concurrent uploads from the same user — only one succeeds
- [x] Test: failed upload rolls back the count
- [x] Existing upload tests pass
