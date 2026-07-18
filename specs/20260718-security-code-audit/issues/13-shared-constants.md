# SEC-013 — Extract shared validation constants

**Status:** resolved
**Priority:** 🟡 Cleanup | **Estimate:** 15m | **Files:** `src/db/upload.func.ts`, `src/routes/upload/index.tsx`, new file `src/shared/constants.ts`
**Wave:** 4

## Problem

`ALLOWED_TYPES` and `MAX_FILE_SIZE` are defined in both `upload.func.ts` (server) and `upload/index.tsx` (client). Change one, forget the other → client/server validation divergence.

## What to do

Create `src/shared/constants.ts`:

```ts
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;
```

Import from both locations. Ensure the shared file has no server-only imports (safe for client bundle).

## Acceptance criteria

- [ ] `ALLOWED_TYPES` and `MAX_FILE_SIZE` defined in exactly one place
- [ ] Both `upload.func.ts` and `upload/index.tsx` import from the shared location
- [ ] No server-only code in the shared constants file
- [ ] Client bundle does not grow unexpectedly

## Rollback

Revert the commit. Duplicated constants are a maintenance issue, not a runtime bug.
