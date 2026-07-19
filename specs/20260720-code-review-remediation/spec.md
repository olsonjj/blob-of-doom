# Implementation Spec — Code Review Remediation

**Based on:** Independent code review (2025-07-20) — security, code quality/architecture, and config/supply-chain passes  
**Status:** In progress — 01, 02, 03 complete  
**Tickets:** [`issues/`](issues/) — 10 vertical slices, numbered in dependency order

---

## Summary

A three-pass independent review of ~7.3k LOC across TanStack Start (React 19 SSR), Drizzle/Neon, Clerk, Vercel Blob, Sharp, and SightEngine surfaced 18 validated issues. No exploitable-now security holes were found — the core authz model is sound. The findings are organized into 10 vertical-slice tickets, each independently demoable.

---

## Tickets

| #   | Ticket                                                          | Blocked by     | Description                                                                |
| --- | --------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------- |
| 01  | [Codebase consolidation](issues/01-codebase-consolidation.md)   | —              | Prefactor: one DB access pattern, one admin guard, one validation approach |
| 02  | [Approved upload limit](issues/02-approved-upload-limit.md)     | 01 ✅          | Approved users get 10 uploads/day; unapproved get 1                        |
| 03  | [Upload race condition](issues/03-upload-race-condition.md)     | 01 ✅          | Atomic daily upload count — concurrent requests can't bypass the cap       |
| 04  | [Admin error handling](issues/04-admin-error-handling.md)       | 01             | Admin dashboard shows error messages instead of crashing on fetch failures |
| 05  | [Production hardening](issues/05-production-hardening.md)       | —              | Security headers, CI, pinned deps, committable `.env.example`              |
| 06  | [Moderation gating](issues/06-moderation-gating.md)             | 01             | Can't rate/view-count hidden blobs; consistent delete behavior             |
| 07  | [Feedback rate limiting](issues/07-feedback-rate-limiting.md)   | 01             | 5 submissions/user/hour max on feedback                                    |
| 08  | [Database indexes](issues/08-database-indexes.md)               | —              | Indexes on filtered/joined/sorted columns                                  |
| 09  | [Admin decomposition](issues/09-admin-decomposition.md)         | 04             | Split 1,094-line admin god-file into focused components                    |
| 10  | [Security boundary tests](issues/10-security-boundary-tests.md) | 01, 02, 03, 06 | Tests for admin guards, ownership, rating upserts, upload rate limiting    |

---

## Dependency Graph

```
01 (consolidation) ──┬── 02 (approved limit)
                     ├── 03 (race condition)
                     ├── 04 (admin errors) ─── 09 (admin decomposition)
                     ├── 06 (moderation gating)
                     └── 07 (feedback rate limit)
                         │
                         10 (boundary tests) ─── depends on 01, 02, 03, 06

05 (production hardening) ── independent
08 (database indexes) ── independent
```

---

## Design Decisions Needed

| Ticket | Decision                                                                              |
| ------ | ------------------------------------------------------------------------------------- |
| 02     | Enforce the `approved` flag (10 uploads/day) or remove it entirely?                   |
| 03     | Atomic increment, `SELECT ... FOR UPDATE`, or DB-level unique constraint?             |
| 06     | Genuine soft-delete (keep files, recoverable) or hard-delete (remove DB row + files)? |

---

## Implementation Order

1. **05** and **08** can start immediately (no blockers)
2. **01** (consolidation prefactor) — unblocks 02, 03, 04, 06, 07
3. **02, 03, 04, 06, 07** — all unblocked after 01, can run in parallel
4. **09** — after 04 (builds on extracted ErrorBanner component)
5. **10** — after 01, 02, 03, 06 (tests verify the implemented behavior)
