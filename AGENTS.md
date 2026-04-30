# AGENTS.md

Guidance for Codex and compatible coding agents working in this repository.

## Project overview

CMM is an Electron desktop monorepo for a single cross-platform desktop application. It
uses Turborepo for orchestration, pnpm for package management, TypeScript for app and
package code, and Biome for code quality.

The repo is structured as a monorepo, but the product context is currently one desktop
application. Prefer simple shared packages and clear service boundaries over adding
multiple independent domain contexts too early.

## Common commands

```bash
# Development
pnpm dev
pnpm desktop:dev

# Code quality
pnpm check
pnpm lint
pnpm format
pnpm typecheck

# Testing
pnpm test
pnpm desktop:test
pnpm test --filter=@repo/core

# Building
pnpm build
```

Run focused commands first when possible, then broaden to package or repo-level checks
when the change touches shared behavior.

## Repository layout

```text
apps/
  desktop/    Electron app: main process, preload, renderer, and desktop tests
packages/
  core/       Shared business logic, spreadsheet helpers, persistence helpers
  ui/         Shared React/component primitives
  types/      Shared TypeScript types
  typescript-config/ Shared tsconfig bases
```

Useful anchors:

- Electron main and preload code lives in `apps/desktop/electron`.
- Renderer code lives in `apps/desktop/src`.
- Local JSON persistence is in `apps/desktop/electron/store.ts`.
- Excel import/export helpers are in `packages/core/src/excel-buffer.ts` and
  `packages/core/src/excel.ts`.
- React Native Web compatibility is shimmed through `apps/desktop/src/react-native.ts`.

## Working conventions

- Use pnpm for all package operations. Do not manually edit dependency entries in
  `package.json`; use `pnpm add` with the right `--filter`.
- Keep workspace dependencies on the `workspace:*` protocol.
- Preserve the hoisted pnpm setup in `.npmrc`; React Native compatibility depends on it.
- Keep Electron-only APIs behind main/preload boundaries and expose renderer-safe APIs
  through typed interfaces.
- Prefer shared logic in `packages/core` only when it is genuinely reusable outside the
  current renderer surface.
- React and React DOM are pinned through root pnpm overrides; keep them in lockstep.

## Code style

Biome enforces formatting and linting:

- 2-space indent, single quotes, trailing commas, 100-character line width.
- Use `import type` / `export type` for type-only imports and exports.
- Avoid unused variables and imports.
- Avoid explicit `any` except where test configuration permits it.
- Avoid `console.log`; use intentional logging only where the app already has a pattern.

TypeScript is strict, including `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`, and `verbatimModuleSyntax`.

## Testing notes

- Desktop unit tests use Vitest.
- Desktop e2e tests use Playwright and run after a desktop build.
- Some packages use Jest through the shared Jest base config.
- Coverage thresholds are 70% for branches, functions, lines, and statements.
- The pre-commit hook runs staged Biome fixes, formatting, linting, checks, and
  typechecking.

## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues for `DefRM-US/CMM`. See
`docs/agents/issue-tracker.md`.

### Triage labels

Use the default five-label triage vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

Use a single-context domain layout for this Electron app monorepo. See
`docs/agents/domain.md`.
