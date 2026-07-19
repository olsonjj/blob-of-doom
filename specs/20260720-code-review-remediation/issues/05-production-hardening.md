# 05 — Production deployment is hardened

**What to build:** The deployed site sends security headers. CI runs on every push and PR, blocking on typecheck, lint, format, and tests. Framework dependencies are pinned to explicit semver versions so a lockfile-less install won't silently pull breaking changes. `.env.example` can be committed to git.

**Blocked by:** None — can start immediately.

**Status:** complete

- [x] `vercel.json` includes `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy` headers
- [x] At least 3 of the 6 disabled `eslint-plugin-security` rules are enabled, with rationale documented for any that remain off
- [x] `scripts/` directory is no longer excluded from linting (either included in main config or given its own relaxed config)
- [x] `format:check` is blocking in the Vercel build command (no `|| true`)
- [x] A `.github/workflows/ci.yml` exists that runs `typecheck`, `lint`, `format:check`, and `test` on push and PR
- [x] All six `"latest"` version strings in `package.json` are replaced with explicit `^` semver ranges matching the currently resolved versions
- [x] `pnpm install` produces an identical lockfile after the version string changes
- [x] `.env.example` is not ignored by git (`.gitignore` has `!.env.example` before the `.env*` rule)
- [x] `nitro` is pinned to a stable release or the beta is documented with a reason
- [x] TypeScript and typescript-eslint versions are compatible (either downgrade TS to ^5.x or upgrade typescript-eslint)
- [x] Build and deploy still succeed
