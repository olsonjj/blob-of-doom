# Implementation Spec — Static Analysis & Formatting

**Status:** Aligned — ready for implementation

---

## Problem Statement

The codebase has no static analysis beyond the TypeScript compiler. While `tsconfig.json` enables `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, and `noUncheckedSideEffectImports`, there are entire categories of bugs and quality issues the compiler cannot catch: React rules violations (conditional hooks, missing deps), floating promises, security-sensitive patterns, import ordering chaos, and inconsistent formatting. As the codebase grows, these gaps become increasingly risky and the formatting drift makes diffs noisier.

## Solution

Add ESLint (flat config) and Prettier as the project's static analysis and formatting layer. ESLint catches React, async, security, and import-ordering issues. Prettier enforces consistent formatting. Both are wired into package.json scripts and the Vercel deploy pipeline: lint failures block deploys, format failures warn only. All existing violations are fixed in a single big-bang pass.

## User Stories

1. As a developer, I want lint errors to catch React hook violations (conditional calls, missing dependencies), so that I don't ship components with subtle state bugs.
2. As a developer, I want lint errors to catch floating promises, so that I don't silently drop async work.
3. As a developer, I want lint errors to catch security-sensitive patterns (eval, dangerouslySetInnerHTML), so that I don't introduce XSS or injection vulnerabilities.
4. As a developer, I want imports to be automatically sorted and organized, so that diffs are clean and merge conflicts are less likely.
5. As a developer, I want naming conventions enforced (PascalCase for components/types, camelCase for everything else), so that the codebase reads consistently.
6. As a developer, I want Prettier to format my code automatically, so that I never think about whitespace, semicolons, or quote style again.
7. As a developer, I want to run `pnpm lint` to check for violations, so that I can verify my code before pushing.
8. As a developer, I want to run `pnpm format` to auto-format all files, so that I can fix formatting in one command.
9. As a developer, I want to run `pnpm format:check` to verify formatting without changing files, so that CI can enforce it.
10. As a developer, I want to run `pnpm typecheck` to run the TypeScript compiler as a check, so that I can verify types separately from the build.
11. As a project maintainer, I want lint failures to block Vercel production deploys, so that bug-prone code never reaches users.
12. As a project maintainer, I want format failures to warn but not block Vercel deploys, so that cosmetic issues don't prevent shipping.
13. As a developer, I want all existing code auto-fixed in one pass, so that the codebase starts from a clean baseline.
14. As a developer, I want editor-agnostic configuration (not VSCode-specific), so that the tooling works regardless of editor choice.

## Implementation Decisions

- **Linter:** ESLint with flat config (`eslint.config.ts`). Chosen over Biome and Oxlint because `@typescript-eslint` provides the most complete rule coverage for async handling, security, and React rules.
- **Formatter:** Prettier with defaults except `printWidth: 120`. Chosen over Biome's built-in formatter because ESLint is already in the stack and Prettier is the standard pairing.
- **Plugin stack:** `typescript-eslint` (strict preset), `eslint-plugin-react-hooks`, `eslint-plugin-react` (recommended preset), `eslint-plugin-simple-import-sort`, `eslint-plugin-security`.
- **Severity policy:** Error for bug-prevention rules (React hooks, floating promises, security). Warn for style/convention rules (naming conventions). Rules already enforced by `tsconfig` (unused vars, unused params) are skipped to avoid redundancy.
- **Naming convention:** PascalCase for components and types/interfaces. camelCase for variables, functions, and methods. No UPPER_CASE enforcement for constants (too noisy, often wrong for object/array constants). Drizzle schema objects are exempt from naming rules.
- **Import sorting:** `eslint-plugin-simple-import-sort` for lightweight auto-fixable import ordering. `eslint-plugin-import` is intentionally excluded — it's heavy and the simple sorter plus TypeScript's own import checking covers the needed value.
- **Formatting enforcement:** Prettier runs as a separate tool, not via `eslint-plugin-prettier`. This keeps linting and formatting as independent concerns and avoids ESLint performance overhead from running Prettier inside rules.
- **CI integration:** Lint failures block Vercel deploys (exit code non-zero). Format failures warn only (run `format:check` but don't fail the build). This is achieved via the Vercel build command or `vercel.json` configuration.
- **Existing violations:** Big-bang approach. Run `eslint --fix` and `prettier --write` on the entire codebase, then manually fix any remaining error-level violations that can't be auto-fixed. The codebase is small enough that this is low-risk.
- **Ignored paths:** `dist/`, `node_modules/`, `src/routeTree.gen.ts` (auto-generated), and any build output directories are excluded from both ESLint and Prettier.

## Testing Decisions

- **What makes a good test:** For tooling configuration, the "tests" are verification that the tools run successfully and produce the expected results. This is validated by running `pnpm lint` (zero errors), `pnpm format:check` (no unformatted files), and `pnpm typecheck` (no type errors) after the big-bang fix pass.
- **Modules tested:** The ESLint config, Prettier config, and package.json scripts are verified by their successful execution. No unit tests are written for configuration files.
- **Prior art:** The codebase uses Vitest for runtime tests. This feature does not add new runtime tests — it adds static verification that runs alongside the existing test suite in CI.

## Out of Scope

- Pre-commit hooks (husky, lint-staged, lefthook). These add friction and can be added later if desired.
- VSCode-specific settings (`.vscode/settings.json`). The configuration is editor-agnostic.
- Biome or Oxlint. ESLint + Prettier is the chosen stack.
- `eslint-plugin-import`. The simple import sorter is sufficient.
- Formatting blocking deploys. Format failures warn only.
- A linting baseline or gradual adoption strategy. Big-bang fix is the chosen approach.
- Custom rule authoring. Only off-the-shelf plugin rules are used.

## Further Notes

- The TypeScript compiler already enforces `noUnusedLocals` and `noUnusedParameters`. The ESLint equivalents should be explicitly turned off to avoid double-reporting and conflicting autofixes.
- `src/routeTree.gen.ts` is auto-generated by the TanStack Router plugin and must be excluded from linting and formatting to avoid churn on regeneration.
- The `@tanstack/devtools-vite` plugin is already in devDependencies and should be first in the Vite plugin array per TanStack conventions. This is unrelated to linting but worth noting during any Vite config changes.
- After the big-bang fix, the diff will be large but mechanical. Review should focus on the non-auto-fixable changes (floating promise fixes, hook dependency additions).
