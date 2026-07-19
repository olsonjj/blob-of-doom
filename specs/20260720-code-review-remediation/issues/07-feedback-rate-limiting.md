# 07 — Feedback submission is abuse-resistant

**What to build:** A single user or IP can't flood the feedback table. After a reasonable number of submissions in a time window, further attempts get a friendly "too many submissions" message instead of being accepted.

**Blocked by:** 01 (consolidation)

**Status:** in-progress

- [x] More than 5 feedback submissions per user (or per IP for anonymous users) per hour are rejected
- [x] The rate limit error message is user-friendly (not a stack trace or generic "Invalid input")
- [x] Legitimate users can still submit feedback normally
- [x] Authenticated users are rate-limited by `submitterProfileId`; anonymous users by IP
- [x] Test: 6th submission within an hour is rejected
- [x] Test: submission after the rate limit window resets is accepted
- [x] Existing feedback tests pass
