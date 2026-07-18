# SEC-005 — Moderation must fail closed (quarantine on error)

**Status:** resolved
**Priority:** 🟠 Fix Soon | **Estimate:** 2h | **Files:** `src/db/moderation.func.ts`, `src/routes/upload/index.tsx`
**Wave:** 2

## Problem

When SightEngine is unreachable or returns an API error, `moderateImage` returns `{ flagged: false }`. During a SightEngine outage, all uploads publish directly with no moderation. The comment says "bias toward availability" but this is a content safety risk.

## What to do

**Option A (recommended):** When SightEngine fails, return `{ flagged: true, moderationUnavailable: true }`. The UI shows "Your upload has been queued for review" instead of silently publishing. Admins see a distinct "moderation unavailable" marker in the flagged queue.

Also add `MODERATION_FAIL_OPEN` env var (default `false`) so operators can restore fail-open behavior during extended outages.

## Acceptance criteria

- [ ] SightEngine API errors → `flagged: true`, `moderationUnavailable: true`
- [ ] Network/timeout errors → `flagged: true`, `moderationUnavailable: true`
- [ ] Missing credentials → `flagged: true`, `moderationUnavailable: true` (currently skips silently)
- [ ] `MODERATION_FAIL_OPEN=true` restores old fail-open behavior
- [ ] Admin flagged queue shows "moderation unavailable" vs "flagged by AI" distinction
- [ ] User sees "queued for review" message instead of silent publish
- [ ] New tests: API error → flagged, network error → flagged, missing creds → flagged

## Rollback

Set `MODERATION_FAIL_OPEN=true` to restore old behavior. Monitor SightEngine status after deploy.
