# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Capability Matrix Management (CMM) - A Tauri v2 desktop application for defense contractors to track and compare capability requirements across companies when responding to RFPs. Users can create matrices, rate capabilities (0-3 scale), import/export Excel files, and compare scores across companies.

## Development Commands

```bash
# Development (frontend only)
bun run dev

# Full Tauri development with hot reload
bun run tauri dev

# Build production release
bun run build          # TypeScript + Vite build
bun run tauri build    # Full native app build
```

**Note:** Uses Bun as package manager (not npm). Vite dev server runs on port 1420 (required by Tauri).

## Architecture

**Frontend (src/):** React 19 + TypeScript + Vite
- Entry: `main.tsx` → `App.tsx`
- UI: TanStack Table for data grids
- Excel: xlsx (SheetJS) for import/export

**Backend (src-tauri/):** Rust + Tauri v2
- Entry: `main.rs` → `lib.rs`
- Commands exposed via `#[tauri::command]` macro
- Invoke from frontend: `import { invoke } from '@tauri-apps/api/core'`

**Storage:** Browser localStorage keyed by context ID (planned migration to SQLite via Tauri SQL plugin)

## Build Outputs

- macOS: `src-tauri/target/release/bundle/dmg/`
- Windows: `src-tauri/target/release/bundle/msi/`
- Linux: `src-tauri/target/release/bundle/deb/` or `appimage/`

## Key Configuration Files

- `src-tauri/tauri.conf.json` - App identifier, window settings, build commands
- `vite.config.ts` - Dev server port 1420, HMR for Tauri
- `tsconfig.json` - ES2020 target, strict mode enabled

## Feature Documentation

Detailed feature specs and data models are in `appInfo/`:
- `capability-matrix-feature.md` - User workflows, data models, Excel format specs
- `tech_stack.md` - Technology overview and project structure
