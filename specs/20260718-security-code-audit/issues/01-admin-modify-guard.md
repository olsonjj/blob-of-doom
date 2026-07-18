# SEC-001 — Prevent admins from modifying other admins

**Status:** resolved
**Priority:** 🔴 Fix Now | **Estimate:** 30m | **Files:** `src/db/admin.func.ts`
**Wave:** 1

## Problem

`setUserBanned` and `setUserApproved` have no check preventing modification of admin users. The UI hides the button but the server function is unprotected — an admin can craft a direct RPC call to ban or un-approve all other admins, locking them out.

## What to do

Add an admin-status check to `setUserBanned` and `setUserApproved` before the update. Query the target user's `isAdmin` field and throw if it's `1`.

```ts
// In both setUserBanned and setUserApproved, after the existing select but before the update:
const [target] = await db
  .select({ isAdmin: profiles.isAdmin })
  .from(profiles)
  .where(eq(profiles.clerkUserId, clerkUserId))
  .limit(1);

if (!target) throw new Error('User not found');
if (target.isAdmin === 1) throw new Error('Cannot modify admin users');
```

## Acceptance criteria

- [ ] `banUser` throws when target is an admin
- [ ] `unbanUser` throws when target is an admin
- [ ] `approveUser` throws when target is an admin
- [ ] `unapproveUser` throws when target is an admin
- [ ] Existing tests for `setUserBanned` / `setUserApproved` still pass
- [ ] New test: `setUserBanned` throws when target is admin

## Rollback

Revert the commit. No data migration.
