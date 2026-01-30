# CMM Multiplatform

Capability Matrix Management - Cross-platform React Native monorepo for macOS, iOS, Android, and Windows.

## Project Structure

```
cmm-multiplatform/
├── apps/
│   ├── mobile/         # Expo app (iOS + Android) - Placeholder
│   ├── macos/          # React Native macOS app
│   └── windows/        # React Native Windows app - Placeholder
├── packages/
│   ├── core/           # Pure TypeScript (types, business logic, excel)
│   ├── state/          # React state management (contexts, hooks)
│   ├── db/             # Database abstraction (expo-sqlite)
│   └── ui/             # Shared UI components - Placeholder
├── turbo.json          # Turborepo configuration
├── pnpm-workspace.yaml # pnpm workspace configuration
└── tsconfig.base.json  # Shared TypeScript configuration
```

## Prerequisites

- Node.js >= 18
- pnpm >= 9.0
- For macOS app: Xcode with macOS SDK
- For Windows app: Visual Studio with Windows SDK (future)

## Getting Started

### Install Dependencies

```bash
pnpm install
```

### Build All Packages

```bash
pnpm build
```

### Run macOS App

```bash
cd apps/macos
pnpm macos
```

## Package Details

### @cmm/core

Pure TypeScript package containing:
- **Types**: `CapabilityMatrix`, `CapabilityMatrixRow`, `Score`, etc.
- **Business Logic**: Requirement numbering, comparison, utilities
- **Excel**: Import/export using xlsx and exceljs

### @cmm/db

Database abstraction layer:
- **Interface**: `DatabaseInterface` for platform-agnostic DB operations
- **Implementation**: `ExpoSQLiteDatabase` using expo-sqlite (works on iOS, Android, macOS)

### @cmm/state

React state management:
- **Context**: `MatrixProvider` with reducer-based state
- **Hooks**: `useMatrices`, `useActiveMatrix`, `useDebouncedSave`

### @cmm/ui

Placeholder for shared UI components across platforms.

## Development

### Adding a New Package

1. Create directory under `packages/`
2. Add `package.json` with `@cmm/` prefix
3. Add to workspace dependencies as needed

### Adding a New App

1. Create directory under `apps/`
2. Configure Metro for monorepo (see `apps/macos/metro.config.js`)
3. Install workspace packages: `pnpm add @cmm/core @cmm/db @cmm/state`

## Future Work

- **apps/mobile**: Expo app for iOS and Android
- **apps/windows**: React Native Windows app
- **packages/ui**: Shared UI component library
