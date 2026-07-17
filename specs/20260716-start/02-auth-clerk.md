# 02 — Auth (Clerk integration)

**What to build:** Sign in and sign up via Clerk with GitHub, Google, and Discord social providers. Public routes are accessible to anyone; protected routes (upload, rate, admin) require authentication. The nav shows a user menu with login state. Sessions persist across visits.

**Blocked by:** 01 — Project scaffold + database schema + dark theme shell

**Status:** ready-for-agent

- [ ] Clerk SDK installed and configured with TanStack Start
- [ ] GitHub, Google, and Discord social providers enabled in Clerk dashboard
- [ ] Sign-in page with social provider buttons, styled with dark theme
- [ ] Sign-up page with social provider buttons, styled with dark theme
- [ ] Public routes accessible without authentication: `/` (homepage), `/gallery`
- [ ] Protected route middleware: unauthenticated users redirected to sign-in
- [ ] User menu in the nav header: shows avatar/name when signed in, "Sign In" link when signed out
- [ ] Session persists across page navigations and browser restarts
- [ ] `profiles` table row created (or upserted) on first sign-in, keyed by Clerk user ID
