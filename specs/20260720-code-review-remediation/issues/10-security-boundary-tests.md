# 10 — Security boundaries have test coverage

**What to build:** Admin guards, ownership checks, rating upserts, and upload rate limiting all have tests that catch regressions. Tests exercise the real Drizzle interface rather than mocking fluent chains by hand, so they fail when queries change.

**Blocked by:** 01 (consolidation), 02 (approved upload limit), 03 (upload race condition), 06 (moderation gating)

**Status:** ready-for-agent

- [ ] Admin guard tests: authenticated user, unauthenticated user, admin user, non-admin user — for both `requireAdmin` (throws) and `checkIsAdmin` (returns boolean)
- [ ] Ownership guard tests: user can edit own blob, user cannot edit another's blob, admin can edit any blob
- [ ] Rating upsert tests: insert new rating, update existing rating, concurrent upserts from same user don't conflict, rating hidden/deleted blob throws
- [ ] Upload rate limit tests: approved user gets 10/day, unapproved gets 1/day, admin bypasses, concurrent requests can't race, failed upload rolls back count
- [ ] Tests use the real Drizzle interface (test database or neon/http-level mock) rather than mocking Drizzle's fluent chain
- [ ] All new tests pass
- [ ] Existing tests still pass
