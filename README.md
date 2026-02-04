# Capability Matrix Manager

Capability Matrix Manager is a React Native desktop app for building structured requirement matrices and exporting them to Excel. It’s designed for fast capture, hierarchical organization, and clean handoffs.

**Status**
- macOS: stable
- Windows: experimental

**Key Features**
- Project list with autosave
- Hierarchical requirements (Tab to indent, Shift+Tab to outdent)
- Excel export with a consistent, ready-to-share template

**Quick Start (macOS)**
```bash
pnpm install
pnpm macos:dev
```

**Requirements**
- Node.js 22 LTS recommended (required for Windows tooling; works for macOS too)
- pnpm (workspace uses `node-linker=hoisted` in `.npmrc`)
- Xcode + macOS developer tooling for building the macOS app

For the full environment setup (including Windows), see `appInfo/setup.md`.

**How It Works**
The macOS app stores projects and requirements in a local SQLite database and autosaves as you type. Requirements are nested into a numbered outline. The Excel export uses a lightweight XLSX generator implemented in `packages/core/src/excel.ts`.

**Repo Layout**
```
apps/
  macos/      React Native macOS app
  windows/    React Native Windows app (experimental)
packages/
  core/       Database + export + filesystem utilities
  ui/         Shared React Native components
  types/      Shared TypeScript types
  typescript-config/  Shared TS configs
```

**Excel Export Notes**
- Single worksheet named `Data Export`
- Columns: `Number`, `Requirement`, `Status`, `Contractor Response`, `Contractor Notes`
- All values stored as strings

More details in `appInfo/excel-export.md`.

**Troubleshooting**
- If Metro resolves the wrong React Native instance (RCTText crash), use the macOS Metro config in `apps/macos/metro.config.js`. See `appInfo/macos-metro-react-native.md`.
- If Metro can’t resolve modules in the monorepo, confirm `.npmrc` includes `node-linker=hoisted`, then reinstall dependencies.

**Contributing**
Pull requests are welcome. By contributing, you agree that your contributions will be licensed under the same license as this repository and that DefRM branding and attribution requirements remain in place.

**License (DefRM Source‑Available)**
This project is source‑available, free to use, and allows modifications and redistribution with conditions:
- DefRM branding must remain visible in the app UI.
- DefRM attribution must appear in documentation/README for any redistribution.
- Modified versions must note that changes were made.
- Commercial use is allowed, but selling the software itself or charging for access to it is not allowed.

See `LICENSE` for full terms.
