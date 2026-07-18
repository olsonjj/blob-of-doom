# 01 — Schema & query filters for flagged blobs

**What to build:** Add the `flagged` and `moderation_scores` columns to the blobs table, then update all public queries (gallery, featured, blob detail) to exclude flagged blobs. After this ticket, the database and queries are ready for flagged content — but nothing creates flagged blobs yet, so all existing content still appears normally.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Add `flagged` column to blobs schema (`integer`, default 0)
- [ ] Add `moderation_scores` column to blobs schema (`jsonb`, nullable)
- [ ] Generate and apply Drizzle migration
- [ ] Update gallery query to filter `WHERE flagged = 0`
- [ ] Update featured query to filter `WHERE flagged = 0`
- [ ] Update blob detail query to filter `WHERE flagged = 0`
- [ ] Update test mock chains to include the new where clause
- [ ] All existing tests pass
