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

### Frontend (src/)
React 19 + TypeScript + Vite + Tailwind CSS 4

**Entry:** `main.tsx` → `App.tsx` (wraps with ErrorBoundary, ThemeProvider, ToastProvider, MatrixProvider)

**Component Organization:**
- `components/matrix/` - Matrix editor, table, toolbar, row components
- `components/comparison/` - Side-by-side matrix comparison view
- `components/import/` - Excel import UI and preview
- `components/export/` - Export modal and preview
- `components/ui/` - Reusable UI primitives (Button, Dialog, Tabs, etc.)

**State Management:**
- `contexts/MatrixContext.tsx` - Global matrix state via useReducer pattern
- `contexts/ThemeContext.tsx` - Light/dark theme toggle
- `contexts/ToastContext.tsx` - Toast notifications

**Custom Hooks:**
- `hooks/useMatrices.ts` - CRUD operations for matrices
- `hooks/useActiveMatrix.ts` - Active matrix selection and row operations
- `hooks/useDebouncedSave.ts` - Debounced persistence

**Data Layer:**
- `lib/database.ts` - SQLite operations via Tauri SQL plugin (singleton pattern)
- `lib/excel/importer.ts` - Parse Excel files using xlsx (SheetJS)
- `lib/excel/exporter.ts` - Generate Excel files using exceljs
- `lib/comparison.ts` - Build comparison data across matrices
- `lib/requirementNumber.ts` - Hierarchical requirement numbering logic

**Types:** `types/matrix.ts` - Core types (CapabilityMatrix, CapabilityMatrixRow, Score, etc.)

### Backend (src-tauri/)
Rust + Tauri v2

**Entry:** `main.rs` → `lib.rs`

**Plugins Used:**
- `tauri-plugin-sql` - SQLite database with migrations
- `tauri-plugin-dialog` - Native file dialogs
- `tauri-plugin-fs` - Filesystem access
- `tauri-plugin-opener` - Open URLs/files

**Database:** SQLite stored as `cmm.db`. Migrations in `src-tauri/migrations/`. Tables: `matrices`, `matrix_rows`, `app_settings`.

## Design System

Uses DefRM design system (documented in `appInfo/DEFRM_DESIGN_SYSTEM.md`):
- OKLCH color tokens for light/dark themes
- Glassmorphic card effects with backdrop-blur
- Geist font family (with Poppins fallback)
- `cn()` utility from `lib/utils.ts` for class merging

## Capability Scores

Scores are 0-3 integers (or null). Configuration in `types/matrix.ts` as `SCORE_CONFIG`:
- 3 (Blue #4472C4) - Excellent capability
- 2 (Green #70AD47) - Good capability
- 1 (Yellow #FFC000) - Some capability
- 0 (Gray #E5E5E5) - No capability

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
- `DEFRM_DESIGN_SYSTEM.md` - Design tokens, component patterns, accessibility
