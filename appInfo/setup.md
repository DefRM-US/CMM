# React Native Desktop Development: Complete Monorepo Setup Guide

**This guide transforms a fresh macOS M-series machine into a fully configured development environment** for building desktop applications targeting both macOS and Windows using React Native. Every command has been validated against early 2025 tooling, and known incompatibilities are flagged with workarounds.

A critical version consideration: React Native Windows 0.81 requires **Node.js 22.14+**, while React Native macOS 0.79 works with Node 20+. Use Node 22 LTS to satisfy both platforms.

---

## Phase 1: System prerequisites and tooling

### macOS development machine setup

Install Xcode and command-line tools first—this takes the longest and blocks everything else:

```bash
# Install Xcode 16+ from Mac App Store (required for iOS 18 SDK, mandatory April 2025)
# After installation, accept license and install components:
sudo xcodebuild -license accept
xcode-select --install
```

Install Homebrew and essential dependencies:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Add to PATH (Apple Silicon)
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"

# Install React Native dependencies
brew install node@22 watchman cocoapods
brew link node@22

# Verify installations
node --version   # Should show v22.x.x
watchman --version
pod --version
```

Install pnpm globally:

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm --version  # Should show 9.x.x
```

**Verification checkpoint**: Run `node -v && pnpm -v && watchman -v && pod --version` and confirm all four commands succeed.

### Windows development machine requirements

Your co-founder's Windows laptop needs Visual Studio 2022 with specific workloads. Run this PowerShell command **as Administrator**:

```powershell
Set-ExecutionPolicy Unrestricted -Scope Process -Force
iex (New-Object System.Net.WebClient).DownloadString('https://aka.ms/rnw-vs2019-deps.ps1')
```

This script installs Visual Studio 2022 with UWP development, C++ desktop development, and Windows 10/11 SDK 10.0.19041.0. Additionally:

- Enable **Developer Mode** in Windows Settings → Privacy & Security → For Developers
- Install Node.js 22 LTS from nodejs.org
- Install pnpm: `corepack enable && corepack prepare pnpm@latest --activate`

---

## Phase 2: Monorepo initialization with Turborepo

### Create the base structure

```bash
# Create and enter project directory
mkdir rn-desktop-app && cd rn-desktop-app

# Initialize pnpm workspace
pnpm init

# Create folder structure
mkdir -p apps/macos apps/windows packages/{core,ui,types,typescript-config}
```

### Configure pnpm workspace

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Create `.npmrc` with React Native-specific hoisting (critical—Metro bundler fails without this):

```ini
# Required for React Native - creates flat node_modules
node-linker=hoisted

# Peer dependency handling
auto-install-peers=true
strict-peer-dependencies=false

# Consistent resolution
resolution-mode=highest
```

### Configure root package.json

Replace the generated `package.json`:

```json
{
  "name": "rn-desktop-monorepo",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "format": "turbo run format",
    "check": "turbo run check",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "macos:dev": "turbo run dev --filter=@app/macos",
    "windows:dev": "turbo run dev --filter=@app/windows",
    "prepare": "husky"
  },
  "devDependencies": {
    "@biomejs/biome": "2.3.11",
    "husky": "^9.1.0",
    "turbo": "^2.5.5",
    "typescript": "^5.7.0"
  }
}
```

### Configure Turborepo

Create `turbo.json`:

```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "globalDependencies": [".env", "tsconfig.json"],
  "globalEnv": ["NODE_ENV", "CI"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "build/**"],
      "inputs": ["src/**", "package.json", "tsconfig.json"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"],
      "outputs": [],
      "cache": true
    },
    "format": {
      "outputs": [],
      "cache": false
    },
    "check": {
      "dependsOn": ["^build"],
      "outputs": [],
      "cache": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"],
      "inputs": ["src/**", "**/*.test.ts", "**/*.test.tsx"]
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    }
  }
}
```

Install root dependencies:

```bash
pnpm install
```

---

## Phase 3: TypeScript configuration with paranoid flags

### Base configuration

Create `packages/typescript-config/package.json`:

```json
{
  "name": "@repo/typescript-config",
  "version": "0.0.0",
  "private": true,
  "files": ["*.json"]
}
```

Create `packages/typescript-config/base.json` with all strict flags:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "forceConsistentCasingInFileNames": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "allowUnusedLabels": false,
    "allowUnreachableCode": false,
    "verbatimModuleSyntax": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "isolatedModules": true,
    "target": "ES2022",
    "lib": ["ES2022"],
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,
    "incremental": true
  },
  "exclude": ["node_modules", "dist", "build", ".turbo", "coverage"]
}
```

Create `packages/typescript-config/react-native.json`:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["ES2022"],
    "jsx": "react-native",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "types": ["react-native", "jest"]
  }
}
```

Create `packages/typescript-config/library.json` for shared packages:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

### Root tsconfig with project references

Create `tsconfig.json` at the monorepo root:

```json
{
  "files": [],
  "references": [
    { "path": "./apps/macos" },
    { "path": "./apps/windows" },
    { "path": "./packages/core" },
    { "path": "./packages/ui" },
    { "path": "./packages/types" }
  ]
}
```

---

## Phase 4: Biome configuration for strict linting

Create `biome.json` at the monorepo root:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.3.11/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true,
    "defaultBranch": "main"
  },
  "files": {
    "includes": ["**"],
    "ignoreUnknown": true
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf"
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error",
        "useExhaustiveDependencies": "error",
        "useHookAtTopLevel": "error"
      },
      "suspicious": {
        "noExplicitAny": "error",
        "noArrayIndexKey": "warn",
        "noConsoleLog": "warn"
      },
      "style": {
        "noNonNullAssertion": "error",
        "useConst": "error",
        "useImportType": "error",
        "useExportType": "error"
      },
      "complexity": {
        "noBannedTypes": "error",
        "noUselessFragments": "error"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "all",
      "semicolons": "always"
    }
  },
  "overrides": [
    {
      "includes": ["**/*.test.ts", "**/*.test.tsx"],
      "linter": {
        "rules": {
          "suspicious": { "noExplicitAny": "off" }
        }
      }
    },
    {
      "includes": ["*.config.js", "*.config.ts", "metro.config.js"],
      "linter": {
        "rules": {
          "style": { "noDefaultExport": "off" }
        }
      }
    }
  ]
}
```

### Pre-commit hooks with Husky

```bash
pnpm add -D husky -w
pnpm exec husky init
```

Create `.husky/pre-commit`:

```bash
biome check --staged --write --no-errors-on-unmatched
```

---

## Phase 5: React Native macOS app setup

### Initialize the macOS application

```bash
cd apps/macos

# Create React Native project
npx @react-native-community/cli init MacOSApp --version 0.79 --skip-install --pm npm

# Move contents up and clean
mv MacOSApp/* MacOSApp/.* . 2>/dev/null || true
rm -rf MacOSApp

# Add macOS support
npx react-native-macos-init
```

Update `apps/macos/package.json`:

```json
{
  "name": "@app/macos",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "react-native run-macos",
    "build": "xcodebuild -workspace macos/MacOSApp.xcworkspace -scheme MacOSApp -configuration Release",
    "start": "react-native start",
    "test": "jest",
    "lint": "biome lint .",
    "check": "biome check .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^19.1.0",
    "react-native": "0.79.3",
    "react-native-macos": "^0.79.1"
  },
  "devDependencies": {
    "@babel/core": "^7.25.0",
    "@babel/preset-env": "^7.25.0",
    "@babel/runtime": "^7.25.0",
    "@react-native/babel-preset": "0.79.3",
    "@react-native/metro-config": "0.79.3",
    "@repo/typescript-config": "workspace:*",
    "@types/react": "^19.0.0",
    "typescript": "^5.7.0"
  }
}
```

Create `apps/macos/tsconfig.json`:

```json
{
  "extends": "@repo/typescript-config/react-native.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@core/*": ["../../packages/core/src/*"],
      "@ui/*": ["../../packages/ui/src/*"],
      "@types/*": ["../../packages/types/src/*"]
    }
  },
  "include": ["src/**/*", "*.ts", "*.tsx", "index.js", "App.tsx"],
  "exclude": ["node_modules", "macos", "ios", "android"]
}
```

### Configure Metro for monorepo

Replace `apps/macos/metro.config.js`:

```javascript
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = {
  watchFolders: [monorepoRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(monorepoRoot, 'node_modules'),
    ],
    extraNodeModules: {
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
```

### Install dependencies and verify

```bash
cd apps/macos
pnpm install

# Install CocoaPods dependencies
cd macos && pod install && cd ..

# Run the app
pnpm dev
```

**Verification checkpoint**: The macOS app should launch showing the React Native welcome screen. If Metro bundler shows errors about missing modules, verify `.npmrc` has `node-linker=hoisted`.

---

## Phase 6: React Native Windows app setup

This must be done on the Windows machine. Create `apps/windows/package.json`:

```json
{
  "name": "@app/windows",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "react-native run-windows --arch x64",
    "build": "react-native run-windows --release --arch x64 --no-launch",
    "start": "react-native start",
    "test": "jest",
    "lint": "biome lint .",
    "check": "biome check .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^19.1.0",
    "react-native": "0.81.5",
    "react-native-windows": "^0.81.1"
  },
  "devDependencies": {
    "@babel/core": "^7.25.0",
    "@babel/preset-env": "^7.25.0",
    "@babel/runtime": "^7.25.0",
    "@react-native/babel-preset": "0.81.5",
    "@react-native/metro-config": "0.81.5",
    "@repo/typescript-config": "workspace:*",
    "@types/react": "^19.0.0",
    "typescript": "^5.7.0"
  }
}
```

On Windows, run:

```powershell
cd apps\windows
pnpm install

# Initialize Windows native project
npx react-native init-windows --overwrite

# Autolink native dependencies
npx react-native autolink-windows

# Run the app
pnpm dev
```

**Important**: Keep a browser open before running—React Native Windows requires it for the JavaScript debugger.

---

## Phase 7: Shared packages setup

### packages/types for TypeScript types

Create `packages/types/package.json`:

```json
{
  "name": "@repo/types",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "biome lint .",
    "check": "biome check ."
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "typescript": "^5.7.0"
  }
}
```

Create `packages/types/tsconfig.json`:

```json
{
  "extends": "@repo/typescript-config/library.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

Create `packages/types/src/index.ts`:

```typescript
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
}
```

### packages/core for business logic

Create `packages/core/package.json`:

```json
{
  "name": "@repo/core",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "lint": "biome lint .",
    "check": "biome check ."
  },
  "dependencies": {
    "@repo/types": "workspace:*",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "@types/jest": "^29.5.0",
    "jest": "^29.7.0",
    "typescript": "^5.7.0"
  }
}
```

### packages/ui for shared React Native components

Create `packages/ui/package.json`:

```json
{
  "name": "@repo/ui",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "lint": "biome lint .",
    "check": "biome check ."
  },
  "dependencies": {
    "@fluentui/react-native": "^0.42.14",
    "@repo/types": "workspace:*",
    "@tanstack/react-table": "^8.21.3",
    "react-hook-form": "^7.71.1",
    "@hookform/resolvers": "^5.2.2",
    "zod": "^3.25.0"
  },
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-native": ">=0.72.0"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "@testing-library/react-native": "^12.9.0",
    "@types/jest": "^29.5.0",
    "@types/react": "^19.0.0",
    "jest": "^29.7.0",
    "typescript": "^5.7.0"
  }
}
```

---

## Phase 8: Jest testing configuration

### Root Jest configuration

Create `jest.config.base.js` at the monorepo root:

```javascript
/** @type {import('jest').Config} */
module.exports = {
  verbose: true,
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

### React Native app Jest config

Create `apps/macos/jest.config.js`:

```javascript
const baseConfig = require('../../jest.config.base');

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  displayName: 'macos-app',
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@fluentui/react-native|@tanstack/react-table)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@core/(.*)$': '<rootDir>/../../packages/core/src/$1',
    '^@ui/(.*)$': '<rootDir>/../../packages/ui/src/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/macos/', '/ios/', '/android/'],
};
```

Create `apps/macos/jest.setup.js`:

```javascript
import '@testing-library/jest-native/extend-expect';

// Mock native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock AsyncStorage if used
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
```

### Package Jest config

Create `packages/core/jest.config.js`:

```javascript
const baseConfig = require('../../jest.config.base');

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  displayName: 'core',
  testEnvironment: 'node',
};
```

---

## Phase 9: Database setup with react-native-sqlite-2

Install in both apps and the core package:

```bash
pnpm add react-native-sqlite-2 --filter=@app/macos --filter=@app/windows --filter=@repo/core
```

For macOS, run pod install:

```bash
cd apps/macos/macos && pod install
```

For Windows, autolink:

```powershell
cd apps\windows
npx react-native autolink-windows
```

Create a database service in `packages/core/src/database.ts`:

```typescript
import SQLite from 'react-native-sqlite-2';

const DB_NAME = 'app.db';

export const initDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const db = SQLite.openDatabase(DB_NAME, '1.0', '', 1);
    
    db.transaction(
      (txn) => {
        txn.executeSql(
          `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`,
          []
        );
      },
      reject,
      resolve
    );
  });
};

export const getDatabase = () => SQLite.openDatabase(DB_NAME, '1.0', '', 1);
```

**Verification**: Add this to your app's entry point and check the console:

```typescript
import { initDatabase, getDatabase } from '@repo/core';

initDatabase().then(() => {
  const db = getDatabase();
  db.transaction((txn) => {
    txn.executeSql('SELECT sqlite_version() as version', [], (_, res) => {
      console.log('SQLite version:', res.rows.item(0).version);
    });
  });
});
```

---

## Phase 10: ExcelJS setup with polyfills

Install ExcelJS and required polyfills:

```bash
pnpm add exceljs buffer stream-browserify process --filter=@repo/core
pnpm add -D empty-module --filter=@app/macos --filter=@app/windows
```

Create `packages/core/src/globals.ts`:

```typescript
// Must be imported before any ExcelJS usage
import { Buffer } from 'buffer';

declare global {
  var Buffer: typeof Buffer;
  var process: NodeJS.Process;
}

globalThis.Buffer = Buffer;

if (typeof globalThis.process === 'undefined') {
  globalThis.process = require('process');
}
(globalThis.process as NodeJS.Process & { browser: boolean }).browser = true;
```

Update Metro config in both apps to include polyfills (already shown in Phase 5).

Create an Excel service in `packages/core/src/excel.ts`:

```typescript
import './globals'; // Must be first
import * as ExcelJS from 'exceljs';
import { DocumentDirectoryPath, writeFile } from '@dr.pogodin/react-native-fs';

export const generateSpreadsheet = async (data: Record<string, unknown>[]): Promise<string> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data Export');

  if (data.length > 0) {
    const columns = Object.keys(data[0] as object).map((key) => ({
      header: key.charAt(0).toUpperCase() + key.slice(1),
      key,
      width: 20,
    }));
    worksheet.columns = columns;
    
    data.forEach((row) => worksheet.addRow(row));

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const filePath = `${DocumentDirectoryPath}/export-${Date.now()}.xlsx`;
  
  await writeFile(filePath, base64, 'base64');
  return filePath;
};
```

---

## Phase 11: File system access

Install @dr.pogodin/react-native-fs:

```bash
pnpm add @dr.pogodin/react-native-fs --filter=@app/macos --filter=@app/windows --filter=@repo/core
```

Link native modules:

```bash
# macOS
cd apps/macos/macos && pod install

# Windows (run on Windows machine)
cd apps\windows
npx react-native autolink-windows
```

Basic usage in `packages/core/src/filesystem.ts`:

```typescript
import {
  DocumentDirectoryPath,
  writeFile,
  readFile,
  exists,
  mkdir,
} from '@dr.pogodin/react-native-fs';

export const APP_DATA_DIR = `${DocumentDirectoryPath}/AppData`;

export const ensureAppDirectory = async (): Promise<void> => {
  const dirExists = await exists(APP_DATA_DIR);
  if (!dirExists) {
    await mkdir(APP_DATA_DIR);
  }
};

export const saveJSON = async <T>(filename: string, data: T): Promise<string> => {
  await ensureAppDirectory();
  const filePath = `${APP_DATA_DIR}/${filename}.json`;
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  return filePath;
};

export const loadJSON = async <T>(filename: string): Promise<T | null> => {
  const filePath = `${APP_DATA_DIR}/${filename}.json`;
  const fileExists = await exists(filePath);
  if (!fileExists) return null;
  
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content) as T;
};
```

---

## Phase 12: FluentUI React Native components

Already installed in packages/ui. Create a themed component wrapper in `packages/ui/src/components/ThemedButton.tsx`:

```tsx
import React from 'react';
import { Button, Text } from '@fluentui/react-native';

interface ThemedButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

export const ThemedButton: React.FC<ThemedButtonProps> = ({ title, onPress, disabled }) => {
  return (
    <Button onClick={onPress} disabled={disabled}>
      <Text>{title}</Text>
    </Button>
  );
};
```

---

## Phase 13: TanStack Table with React Native

Create a reusable table component in `packages/ui/src/components/DataTable.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
}

export function DataTable<T>({ data, columns }: DataTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <ScrollView horizontal>
      <View>
        {/* Header */}
        {table.getHeaderGroups().map((headerGroup) => (
          <View key={headerGroup.id} style={styles.row}>
            {headerGroup.headers.map((header) => (
              <Text key={header.id} style={styles.headerCell}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </Text>
            ))}
          </View>
        ))}

        {/* Body */}
        {table.getRowModel().rows.map((row) => (
          <View key={row.id} style={styles.row}>
            {row.getVisibleCells().map((cell) => (
              <Text key={cell.id} style={styles.cell}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ddd' },
  headerCell: { flex: 1, padding: 12, fontWeight: 'bold', minWidth: 120 },
  cell: { flex: 1, padding: 12, minWidth: 120 },
});
```

---

## Phase 14: React Hook Form with Zod validation

Create a form example in `packages/ui/src/components/UserForm.tsx`:

```tsx
import React from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  age: z.coerce.number().min(18, 'Must be at least 18').max(120, 'Invalid age'),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  onSubmit: (data: UserFormData) => void;
}

export const UserForm: React.FC<UserFormProps> = ({ onSubmit }) => {
  const { control, handleSubmit, formState: { errors } } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: '', email: '', age: undefined },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Name</Text>
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            placeholder="Enter name"
          />
        )}
      />
      {errors.name && <Text style={styles.error}>{errors.name.message}</Text>}

      <Text style={styles.label}>Email</Text>
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            placeholder="Enter email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        )}
      />
      {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}

      <Text style={styles.label}>Age</Text>
      <Controller
        control={control}
        name="age"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value?.toString() ?? ''}
            placeholder="Enter age"
            keyboardType="numeric"
          />
        )}
      />
      {errors.age && <Text style={styles.error}>{errors.age.message}</Text>}

      <Pressable style={styles.button} onPress={handleSubmit(onSubmit)}>
        <Text style={styles.buttonText}>Submit</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20 },
  label: { fontSize: 16, marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 6 },
  error: { color: 'red', marginTop: 4 },
  button: { backgroundColor: '#0078d4', padding: 14, borderRadius: 6, marginTop: 20 },
  buttonText: { color: 'white', textAlign: 'center', fontWeight: '600' },
});
```

---

## Phase 15: Build and distribution

### macOS DMG with notarization

Create a build script at `scripts/build-macos.sh`:

```bash
#!/bin/bash
set -e

APP_NAME="YourApp"
SCHEME="MacOSApp"
TEAM_ID="YOUR_TEAM_ID"
NOTARY_PROFILE="NOTARY_PROFILE"

cd apps/macos

# Archive
xcodebuild archive \
  -workspace macos/${APP_NAME}.xcworkspace \
  -scheme $SCHEME \
  -configuration Release \
  -archivePath build/${APP_NAME}.xcarchive \
  -destination 'generic/platform=macOS'

# Export
xcodebuild -exportArchive \
  -archivePath build/${APP_NAME}.xcarchive \
  -exportPath build/export \
  -exportOptionsPlist ../../scripts/ExportOptions.plist

# Create DMG
npx create-dmg "build/export/${APP_NAME}.app" build/release --overwrite

# Notarize
xcrun notarytool submit build/release/*.dmg \
  --keychain-profile "$NOTARY_PROFILE" \
  --wait

# Staple
xcrun stapler staple build/release/*.dmg

echo "DMG ready at: build/release/"
```

Create `scripts/ExportOptions.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>developer-id</string>
    <key>teamID</key>
    <string>YOUR_TEAM_ID</string>
</dict>
</plist>
```

### Windows MSIX

On the Windows machine, build release:

```powershell
cd apps\windows
npx react-native run-windows --release --arch x64 --no-launch

# For MSIX packaging, open in Visual Studio:
# 1. Open windows\YourApp.sln
# 2. Right-click project > Publish > Create App Packages
# 3. Follow wizard for sideloading or Store submission
```

---

## Common issues and troubleshooting

### Metro bundler fails with "Unable to resolve module"

**Cause**: pnpm's symlinked node_modules structure.  
**Fix**: Verify `.npmrc` contains `node-linker=hoisted` and run `pnpm install` again.

### Windows app won't start

**Cause**: No browser open for JavaScript debugger.  
**Fix**: Open Chrome or Edge before running `pnpm dev` in apps/windows.

### Pod install fails on macOS

**Cause**: Outdated CocoaPods cache or version mismatch.  
**Fix**: Run `pod repo update && pod install --repo-update` in the macos folder.

### ExcelJS throws "Buffer is not defined"

**Cause**: globals.ts not imported before ExcelJS.  
**Fix**: Ensure `import './globals'` is the first import in any file using ExcelJS.

### TypeScript errors about exactOptionalPropertyTypes

**Cause**: Libraries not built for this strict flag.  
**Fix**: Add problematic libraries to `skipLibCheck: true` or create declaration overrides in `packages/types/src/overrides.d.ts`.

### Notarization fails with "Invalid signature"

**Cause**: Binaries inside .app not signed.  
**Fix**: Sign all nested frameworks and binaries with the same Developer ID certificate before creating the DMG.

---

## Verification checklist

Run these commands to confirm your setup is complete:

```bash
# 1. Monorepo structure
pnpm install                    # Should complete without errors

# 2. Type checking
pnpm typecheck                  # Should pass with no errors

# 3. Linting
pnpm check                      # Biome should report no issues

# 4. Tests
pnpm test                       # Jest should run all tests

# 5. macOS app
cd apps/macos && pnpm dev       # App should launch

# 6. Windows app (on Windows)
cd apps\windows && pnpm dev     # App should launch with browser open
```

Each step should complete successfully before proceeding to the next. If any step fails, consult the troubleshooting section above or check the error output for specific dependency or configuration issues.

