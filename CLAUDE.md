# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Electron desktop monorepo for a single cross-platform desktop application. Uses Turborepo for orchestration, pnpm for package management, and Biome for code quality.

## Common Commands

```bash
# Development
pnpm dev              # Run all dev tasks
pnpm desktop:dev      # Run the Electron app only

# Code Quality
pnpm check            # Biome checks
pnpm lint             # Lint only
pnpm format           # Format only
pnpm typecheck        # TypeScript checking

# Testing
pnpm test             # Run all tests
pnpm desktop:test     # Run Electron unit + flow tests
pnpm test --filter=@repo/core  # Run tests for a specific package

# Building
pnpm build            # Build all packages
```

## Monorepo Structure

```text
apps/
  desktop/    → @app/desktop (Electron + React renderer)
packages/
  core/       → @repo/core (spreadsheet helpers and shared logic)
  ui/         → @repo/ui (shared component primitives)
  types/      → @repo/types (TypeScript type definitions)
  typescript-config/ → Shared tsconfig bases
```

## Architecture Notes

- **Desktop shell**: Electron main and preload live in `apps/desktop/electron`
- **Persistence**: Local JSON store in `apps/desktop/electron/store.ts`
- **Excel import/export**: Buffer-based XLSX helpers in `packages/core/src/excel-buffer.ts`
- **Forms**: React Hook Form + Zod validation (in `@repo/ui`)
- **Data tables**: TanStack React Table (in `@repo/ui`)
- **Renderer compatibility**: `react-native-web` is shimmed through `apps/desktop/src/react-native.ts`

## Code Style (Enforced by Biome)

- 2-space indent, single quotes, trailing commas
- 100 char line width
- `import type` for type-only imports
- No unused variables or imports
- No explicit `any` except in test files when unavoidable
- No `console.log`

## TypeScript Configuration

Strict mode with additional flags including `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `verbatimModuleSyntax`.

## Key Constraints

- **pnpm hoisting required**: workspace resolution depends on `node-linker=hoisted` in `.npmrc`
- **Workspace protocol**: Dependencies between packages use `workspace:*`
- **React runtime lockstep**: Root overrides pin `react` and `react-dom` to `19.0.0`
- **Coverage threshold**: 70% for branches, functions, lines, and statements
- **Pre-commit hook**: Runs `biome check --staged --write`

## Adding Dependencies

```bash
# Add to a specific package
pnpm add <package> --filter=@repo/core
pnpm add -D <package> --filter=@app/desktop

# Never manually edit package.json for dependencies
```
