# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React Native desktop monorepo for building macOS and Windows applications. Uses Turborepo for orchestration, pnpm for package management, and Biome for code quality.

## Common Commands

```bash
# Development
pnpm dev              # Run all apps in parallel
pnpm macos:dev        # Run macOS app only
pnpm windows:dev      # Run Windows app only

# Code Quality
pnpm check            # Biome lint + format (preferred)
pnpm lint             # Lint only
pnpm format           # Format only
pnpm typecheck        # TypeScript checking

# Testing
pnpm test             # Run all tests
pnpm test --filter=@repo/core  # Run tests for specific package

# Building
pnpm build            # Build all packages
```

## Monorepo Structure

```
apps/
  macos/      → @app/macos (React Native macOS, depends on @repo/core)
  windows/    → @app/windows (React Native Windows)
packages/
  core/       → @repo/core (database, business logic, utilities)
  ui/         → @repo/ui (shared React Native components)
  types/      → @repo/types (TypeScript type definitions)
  typescript-config/ → Shared tsconfig bases
```

## Architecture Notes

- **Database**: SQLite via react-native-sqlite-2 (initialized in @repo/core)
- **UI Framework**: FluentUI React Native
- **Forms**: React Hook Form + Zod validation
- **Data Tables**: TanStack React Table
- **Path Aliases**: `@/*` (local), `@core/*`, `@ui/*`, `@types/*`

## Code Style (Enforced by Biome)

- 2-space indent, single quotes, trailing commas
- 100 char line width
- `import type` for type-only imports
- No unused variables/imports (error)
- No explicit `any` (error, except in test files)
- No `console.log` (warning)

## TypeScript Configuration

Strict mode with additional flags: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`. Packages extend from `@repo/typescript-config/react-native.json`.

## Key Constraints

- **pnpm hoisting required**: Metro bundler needs `node-linker=hoisted` in .npmrc
- **Workspace protocol**: Dependencies between packages use `workspace:*`
- **Coverage threshold**: 70% for branches/functions/lines/statements
- **Pre-commit hook**: Runs `biome check --staged --write`

## Adding Dependencies

```bash
# Add to specific package
pnpm add <package> --filter=@repo/core
pnpm add -D <package> --filter=@app/macos

# Never manually edit package.json for dependencies
```

## Detailed Setup Reference

See `appInfo/setup.md` for comprehensive 15-phase setup documentation including troubleshooting.
