# Windows-Specific Setup Instructions

This document contains setup steps that must be performed on a Windows machine.

## Prerequisites

- Windows 10/11 with Visual Studio 2022 installed
- Node.js 18+ and pnpm installed
- Clone the repository and run `pnpm install` from the root

## Phase 9: Database Setup

The Windows app has `react-native-sqlite-2` and `@repo/core` as dependencies, but the native Windows project needs to be initialized and linked.

### Step 1: Initialize the Windows Native Project

```powershell
cd apps\windows

# Initialize Windows native project (creates App.tsx, native files, etc.)
npx react-native init-windows --overwrite
```

This creates the native Windows project structure including:
- `windows/` folder with C++ project files
- `App.tsx` React Native entry point

### Step 2: Autolink Native Dependencies

```powershell
# Still in apps\windows directory
npx react-native autolink-windows
```

This links `react-native-sqlite-2` and other native modules to the Windows project.

### Step 3: Add Database Verification Code

After initialization, update `apps/windows/App.tsx` to verify the database works:

```typescript
import { initDatabase, getDatabase } from '@repo/core';
import { useEffect } from 'react';

// Inside your App component, add this useEffect:
useEffect(() => {
  initDatabase().then(() => {
    const db = getDatabase();
    db.transaction((txn) => {
      txn.executeSql('SELECT sqlite_version() as version', [], (_, res) => {
        console.log('SQLite version:', res.rows.item(0).version);
      });
    });
  });
}, []);
```

### Step 4: Verify Installation

```powershell
# From repo root
pnpm windows:dev
```

Check the Metro console output for: `SQLite version: X.X.X`

## Troubleshooting

### Build Errors with Native Modules

If `react-native-sqlite-2` fails to link:

1. Ensure Visual Studio 2022 has the "Desktop development with C++" workload installed
2. Re-run `npx react-native autolink-windows`
3. Clean and rebuild: `cd windows && msbuild /t:Clean && cd .. && pnpm windows:dev`

### Module Not Found Errors

If `@repo/core` can't be resolved:

1. Ensure you've run `pnpm install` from the repo root
2. Check that `metro.config.js` has proper workspace resolution configured
