# Capability Matrix Manager

Capability Matrix Manager is an Electron desktop app for building structured requirement matrices, exporting them to Excel, and importing vendor responses for side-by-side review.

**Status**
- Desktop: supported via a single Electron app

**Key Features**
- Project list with autosave
- Hierarchical requirements with keyboard-first editing
- Excel export with a ready-to-share template
- Vendor response import and comparison view

**Quick Start**
```bash
pnpm install
pnpm desktop:dev
```

**Requirements**
- Node.js 22 LTS recommended
- pnpm with the workspace hoisting configuration from `.npmrc`

**How It Works**
The Electron app persists project data locally and autosaves as you type. Requirements are nested into a numbered outline. Spreadsheet export and import use the buffer-based XLSX helpers in `packages/core/src/excel-buffer.ts`.

**Repo Layout**
```text
apps/
  desktop/    Electron app
packages/
  core/       Spreadsheet helpers and shared logic
  ui/         Shared component primitives
  types/      Shared TypeScript types
  typescript-config/  Shared TS configs
```

**Testing**
```bash
pnpm --filter @app/desktop test
```

The desktop suite includes store-level unit tests and Playwright Electron flows covering project creation, persistence, export, and import.

**Troubleshooting**
- If Electron starts without rendering the app, rebuild the desktop bundle with `pnpm --filter @app/desktop build`.
- If workspace resolution drifts, reinstall dependencies with `pnpm install` so the React and React DOM overrides are applied consistently.

**Contributing**
Pull requests are welcome. By contributing, you agree that your contributions will be licensed under the same license as this repository and that DefRM branding and attribution requirements remain in place.

**License (DefRM Source-Available)**
This project is source-available, free to use, and allows modifications and redistribution with conditions:
- DefRM branding must remain visible in the app UI.
- DefRM attribution must appear in documentation or README for any redistribution.
- Modified versions must note that changes were made.
- Commercial use is allowed, but selling the software itself or charging for access to it is not allowed.

See `LICENSE` for full terms.
