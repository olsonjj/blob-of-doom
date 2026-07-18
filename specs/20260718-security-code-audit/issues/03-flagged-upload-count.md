# SEC-003 — Flagged uploads must count toward daily limit

**Status:** resolved
**Priority:** 🔴 Fix Now | **Estimate:** 15m | **Files:** `src/db/upload.func.ts`
**Wave:** 1

## Problem

In `uploadBlob` handler, the upload count increment is gated behind `if (!moderation.flagged)`. A malicious user can intentionally upload flagged content (gore, weapons, etc.) to get unlimited uploads — each one gets flagged, none count toward the limit.

## What to do

Remove the `if (!moderation.flagged)` guard. Always increment the count regardless of moderation outcome. The count increment block (currently inside the `if`) moves to unconditional execution.

```ts
// BEFORE:
if (!moderation.flagged) {
  const [profile] = await db.select()...
  // ... count logic
}

// AFTER: always run the count logic (remove the if wrapper)
const [profile] = await db.select()...
// ... same count logic
```

## Acceptance criteria

- [ ] Upload count increments for flagged uploads
- [ ] Upload count increments for clean uploads (no regression)
- [ ] Admins still bypass the limit (no regression)
- [ ] Existing upload tests pass (update any that assert flagged uploads don't count)

## Rollback

Revert the commit. Users who relied on flagged uploads not counting will hit the limit — this is intentional.
