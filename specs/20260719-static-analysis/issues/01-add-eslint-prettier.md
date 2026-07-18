# 01 — Add ESLint + Prettier static analysis

**Status:** ready-for-agent

## Scope

Add ESLint (flat config) and Prettier to the project, wire into scripts and Vercel CI, and fix all existing violations in a big-bang pass.

## Acceptance Criteria

- [ ] `eslint.config.ts` created with flat config using `typescript-eslint` (strict), `react-hooks`, `react` (recommended), `simple-import-sort`, `eslint-plugin-security`
- [ ] Error for bug-prevention rules, warn for style/convention, off for rules already in tsconfig
- [ ] Naming convention: PascalCase for components/types, camelCase for everything else
- [ ] `prettier.config.js` created with defaults + `printWidth: 120`
- [ ] `.prettierignore` created (dist, node_modules, routeTree.gen.ts, etc.)
- [ ] `package.json` scripts: `lint`, `format`, `format:check`, `typecheck`
- [ ] Vercel: lint failures block deploy, format failures warn only
- [ ] All existing code auto-fixed (`eslint --fix` + `prettier --write`)
- [ ] Remaining non-auto-fixable error-level violations manually resolved
- [ ] `pnpm lint` exits zero
- [ ] `pnpm format:check` exits zero
- [ ] `pnpm typecheck` exits zero
- [ ] Existing Vitest tests still pass

## Comments
