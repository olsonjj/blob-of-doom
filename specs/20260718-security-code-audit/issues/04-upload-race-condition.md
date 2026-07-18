# SEC-004 — TOCTOU race condition on upload limit

**Priority:** 🟠 Fix Soon | **Estimate:** 1.5h | **Files:** `src/db/upload.func.ts`
**Wave:** 2

## Problem

`checkUploadLimit` reads the current count, then the handler later increments it — after image processing, moderation, and Vercel Blob upload. Two concurrent requests can both pass the check before either writes, bypassing the daily limit.

## What to do

**Use Option A (increment-first):** Move the count increment to _before_ image processing, moderation, and Blob upload. If any subsequent step fails, decrement the count back. This closes the race window without holding a long-lived row lock.

```
1. Check limit (read)
2. Increment count immediately (write) — closes the race
3. Process image, moderate, upload to Blob
4. Insert DB record
5. If any step 3-4 fails, decrement count back
```

## Acceptance criteria

- [ ] Two concurrent upload requests from the same user cannot both succeed
- [ ] Failed uploads (processing error, moderation error, Blob error) do not permanently consume the daily slot
- [ ] Successful uploads count exactly once
- [ ] New test: concurrent upload race condition is prevented

## Rollback

Revert the commit. The race window is narrow (~100ms) so the existing behavior is unlikely to cause immediate issues.
