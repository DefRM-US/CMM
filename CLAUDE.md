# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Capability Matrix Management (CMM) - A cross-platform React Native application for defense contractors to track and compare capability requirements across companies when responding to RFPs. Users can create matrices, rate capabilities (0-3 scale), import/export Excel files, and compare scores across companies.

**Architecture:** Turborepo + pnpm monorepo with React Native for macOS, iOS, Android, and Windows.

## Development Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run macOS app
cd apps/macos && pnpm macos

# Run dev mode (all packages)
pnpm dev
```

**Note:** Uses pnpm as package manager. Requires `.npmrc` with `node-linker=hoisted` and `shamefully-hoist=true` for React Native compatibility.

## Monorepo Structure

```
├── apps/
│   ├── macos/          # React Native macOS app (implemented)
│   ├── mobile/         # Expo app for iOS + Android (placeholder)
│   └── windows/        # React Native Windows app (placeholder)
├── packages/
│   ├── core/           # Pure TypeScript - types, business logic, excel
│   ├── db/             # Database abstraction - expo-sqlite
│   ├── state/          # React state management - contexts, hooks
│   └── ui/             # Shared UI components (placeholder)
├── appInfo/            # Feature documentation and design system
├── turbo.json          # Turborepo task configuration
├── pnpm-workspace.yaml # Workspace definition
└── tsconfig.base.json  # Shared TypeScript config
```

## Package Details

### @cmm/core (packages/core/)

Pure TypeScript, 100% portable across platforms.

- `types/matrix.ts` - Core types: `Score`, `CapabilityMatrix`, `CapabilityMatrixRow`, `SCORE_CONFIG`
- `lib/comparison.ts` - Build comparison data across matrices
- `lib/requirementNumber.ts` - Hierarchical requirement numbering (1, 1.1, 1.2.1)
- `lib/utils.ts` - Utilities: `generateId`, `formatDate`, `debounce`
- `excel/importer.ts` - Parse Excel files using xlsx (SheetJS)
- `excel/exporter.ts` - Generate Excel files using exceljs

### @cmm/db (packages/db/)

Database abstraction layer using expo-sqlite.

- `interface.ts` - `DatabaseInterface` type for platform-agnostic operations
- `expo-sqlite.ts` - Implementation using expo-sqlite (works on macOS, iOS, Android)
- `index.ts` - Factory: `getDatabase()`, `closeDatabase()`, `createDatabase()`

**Database Schema:** SQLite with tables `matrices`, `matrix_rows`, `app_settings`

### @cmm/state (packages/state/)

React state management.

- `MatrixContext.tsx` - Global state via useReducer pattern
- `hooks/useMatrices.ts` - CRUD operations for matrices
- `hooks/useActiveMatrix.ts` - Active matrix selection and row operations
- `hooks/useDebouncedSave.ts` - Debounced persistence

### @cmm/macos (apps/macos/)

React Native macOS desktop application.

- `App.tsx` - Root with SafeAreaProvider, MatrixProvider, NavigationContainer
- `src/navigation/AppNavigator.tsx` - Stack navigator with 5 screens
- `src/screens/` - HomeScreen, MatrixEditorScreen, ImportScreen, ExportScreen, ComparisonScreen
- `metro.config.js` - Configured for monorepo with workspace package resolution

## Capability Scores

Scores are 0-3 integers (or null). Configuration in `@cmm/core` as `SCORE_CONFIG`:

- 3 (Blue #4472C4) - Excellent capability
- 2 (Green #70AD47) - Good capability
- 1 (Yellow #FFC000) - Some capability
- 0 (Gray #E5E5E5) - No capability

## Key Configuration Files

- `turbo.json` - Build/dev/lint/test task definitions with caching
- `pnpm-workspace.yaml` - Defines `apps/*` and `packages/*` workspaces
- `tsconfig.base.json` - ES2022, strict mode, bundler module resolution
- `apps/macos/metro.config.js` - Metro bundler config for monorepo

## Feature Documentation

Detailed feature specs and data models are in `appInfo/`:

- `capability-matrix-feature.md` - User workflows, data models, Excel format specs
- `DEFRM_DESIGN_SYSTEM.md` - Design tokens, component patterns, accessibility

## Adding New Packages

1. Create directory under `packages/` with `package.json` using `@cmm/` prefix
2. Add `tsconfig.json` extending `../../tsconfig.base.json`
3. Export from `src/index.ts`
4. Add as dependency in apps: `pnpm add @cmm/new-package`

## Adding New Apps

1. Create directory under `apps/`
2. Configure Metro for monorepo (see `apps/macos/metro.config.js`)
3. Install workspace packages: `pnpm add @cmm/core @cmm/db @cmm/state`
