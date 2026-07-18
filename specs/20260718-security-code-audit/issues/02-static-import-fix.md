# SEC-002 — Fix static import of server-only auth in profile.func.ts

**Priority:** 🔴 Fix Now | **Estimate:** 15m | **Files:** `src/db/profile.func.ts`
**Wave:** 1

## Problem

`profile.func.ts` uses a top-level static import of `@clerk/tanstack-react-start/server`:

```ts
import { auth } from '@clerk/tanstack-react-start/server'
```

This file is imported by `EnsureProfile.tsx` (a client component), creating a path for server-only Clerk code to leak into the client bundle. Every other DB module uses dynamic `await import(...)`. The codebase's own docs in `auth-guards.func.ts:1-18` explain why static imports of server-only packages are dangerous in TanStack Start.

## What to do

Remove the top-level import. Move it inside the handler as a dynamic import, matching the pattern used by every other DB module.

```ts
// Remove line 2: import { auth } from '@clerk/tanstack-react-start/server'

// Inside the handler:
export const ensureProfile = createServerFn({ method: 'POST' }).handler(async () => {
  const { auth } = await import('@clerk/tanstack-react-start/server')
  const { userId } = await auth()
  // ... rest unchanged
})
```

## Acceptance criteria

- [ ] No static import of `@clerk/tanstack-react-start/server` in `profile.func.ts`
- [ ] `ensureProfile` still works: creates profile on first call, no-op on subsequent
- [ ] `EnsureProfile.tsx` does not pull server-only Clerk code into client bundle
- [ ] Existing tests pass

## Rollback

One-line revert. Worst case if broken: new users can't create profiles.
