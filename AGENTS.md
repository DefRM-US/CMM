# AGENTS.md

Guidance for Codex and compatible coding agents working in this repository.

## Product

CMM is a local-first Electron desktop app for defense procurement opportunity work. Users
create one base capability matrix for an opportunity, export it to Excel, import returned
member responses from potential consortium members, and compare those responses to build
consortium coverage.

Use the domain vocabulary in [CONTEXT.md](./CONTEXT.md):

- **Opportunity**, not project.
- **Base Capability Matrix**, not source spreadsheet.
- **Potential Consortium Member**, not vendor/company.
- **Member Response**, not import/vendor response.
- **Opportunity Comparison** and **Consortium Coverage** for comparison workflows.

## Architecture Direction

This repo is being rebuilt from a prototype architecture. Read
[docs/architecture/rebuild-plan.md](./docs/architecture/rebuild-plan.md) before planning
large changes, and check [docs/adr](./docs/adr/) for resolved decisions.

Target boundary:

```text
Renderer UI
  -> typed IPC client
Preload bridge
  -> narrow contextBridge API
Electron main
  -> application services
Domain + repositories + workbook/file adapters
```

Initial target packages:

```text
@cmm/domain
@cmm/application
@cmm/contracts
@cmm/workbook
@cmm/persistence-sqlite
@cmm/ui
@cmm/typescript-config
```

Important rebuild decisions:

- Use React DOM for the renderer; do not carry forward React Native Web.
- Use SQLite with `better-sqlite3`; do not migrate the prototype JSON store.
- Use ExcelJS for workbook build/parse.
- Keep `@cmm/domain` pure TypeScript with no React, Electron, SQLite, filesystem, ExcelJS,
  or Zod imports.
- Runtime schemas live at boundaries such as IPC contracts, not inside domain logic.
- Renderer code must not import Node, Electron, SQLite, filesystem, or workbook file IO.
- Electron main owns dialogs, filesystem, workbook IO, SQLite, and local logging.
- `@cmm/ui` contains generic React DOM primitives only; CMM-specific UI belongs in the
  desktop renderer.
- Do not import another package's `src` by relative path.

## Common Commands

Current prototype commands:

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

During the rebuild, prefer focused package commands once the `@cmm/*` packages exist,
then broaden to app or workspace-level checks when changes cross boundaries.

## Current Prototype Layout

```text
apps/
  desktop/    Electron app: main process, preload, renderer, and desktop tests
packages/
  core/       Prototype shared logic, workbook helpers, and alternate persistence code
  ui/         Prototype shared React/component primitives
  types/      Placeholder shared types
  typescript-config/
```

Useful current anchors:

- Electron main and preload code: `apps/desktop/electron`
- Renderer code: `apps/desktop/src`
- Prototype JSON persistence: `apps/desktop/electron/store.ts`
- Prototype workbook helpers: `packages/core/src/excel-buffer.ts` and
  `packages/core/src/excel.ts`
- Prototype React Native Web shim: `apps/desktop/src/react-native.ts`

Do not treat the prototype layout as the target architecture.

## Working Conventions

- Use pnpm for all package operations. Do not manually edit dependency entries in
  `package.json`; use `pnpm add` with the correct `--filter`.
- Keep workspace dependencies on the `workspace:*` protocol.
- Keep React and React DOM in lockstep with root overrides.
- Preserve strict TypeScript settings.
- Prefer small vertical slices that cut through domain, application, persistence, IPC, and
  renderer only when needed.
- Before replacing major prototype behavior, add focused characterization tests for the
  critical workflow being replaced.
- Do not add legacy compatibility, backup/restore, telemetry, encryption, global member
  directory, or packaging work unless the user explicitly brings it into scope.
- Do not prefix agent-created branches with `codex/`; prefer issue-scoped descriptive branch names like `feature/rebuild-opportunity-tracer`
- Do not prefix pull request titles with `[codex]`.

## Code Style

Biome enforces formatting and linting:

- 2-space indent, single quotes, trailing commas, 100-character line width.
- Use `import type` and `export type` for type-only imports and exports.
- Avoid unused variables and imports.
- Avoid explicit `any` except where test configuration permits it.
- Avoid `console.log`; use intentional logging only where the app already has a pattern.

TypeScript is strict, including `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`, and `verbatimModuleSyntax`.

## Testing Notes

- Desktop unit tests use Vitest.
- Desktop e2e tests use Playwright and run after a desktop build.
- Some prototype packages use Jest through the shared Jest base config.
- Coverage thresholds are 70% for branches, functions, lines, and statements.
- The pre-commit hook runs staged Biome fixes, formatting, linting, checks, and
  typechecking.

Verification should match the change:

- Domain changes: package unit tests.
- Workbook changes: workbook unit tests and round-trip tests.
- Persistence changes: migration/repository integration tests.
- IPC changes: contract/handler tests.
- Renderer workflow changes: focused unit tests plus desktop e2e smoke where useful.

## Agent Skills

### Issue Tracker

Issues and PRDs are tracked in GitHub Issues for `DefRM-US/CMM`. See
[docs/agents/issue-tracker.md](./docs/agents/issue-tracker.md).

### Triage Labels

Use the default five-label triage vocabulary. See
[docs/agents/triage-labels.md](./docs/agents/triage-labels.md).

### Domain Docs

This repo uses a single-context domain layout. See
[docs/agents/domain.md](./docs/agents/domain.md).
