# SEC-015 — Test coverage for untested DB modules

**Status:** deferred
**Priority:** 🔵 Defer | **Estimate:** 4h | **Files:** `src/db/__tests__/`
**Wave:** 5

> **Deferred:** Waves 1–3 (SEC-001 through SEC-013) are complete and pushed. This item and SEC-014 are deferred to a future session.

## Problem

6 of 12 DB modules have no tests: `moderation.func.ts`, `blob-detail.func.ts`, `blob-edit.func.ts`, `auth-guards.func.ts`, `profile.func.ts`, `admin-check.func.ts`.

## What to do

Add tests in priority order:

1. **`moderation.func.ts`** — clean image, flagged image, API error, network error, missing credentials
2. **`auth-guards.func.ts`** — authenticated, unauthenticated, admin, non-admin
3. **`profile.func.ts`** — new user insert, existing user no-op, unauthenticated
4. **`blob-edit.func.ts`** — ownership verification, update, soft-delete
5. **`blob-detail.func.ts`** — view counting, blob retrieval
6. **`admin-check.func.ts`** — admin verification

## Acceptance criteria

- [ ] `moderation.func.ts` has tests for all five scenarios
- [ ] `auth-guards.func.ts` has tests for all four scenarios
- [ ] `profile.func.ts` has tests for all three scenarios
- [ ] Remaining modules have at least happy-path and error-path tests
