# CMM Implementation Plan

## Overview

Transform the Capability Matrix feature from an existing web app into a standalone Tauri v2 desktop application. The app enables defense contractors to track capability requirements, rate their capabilities (0-3), and compare scores across companies.

---

## Current State

**Exists:**
- Tauri v2 + React 19 + Vite scaffold
- Dependencies: `@tanstack/react-table`, `xlsx`, `@tauri-apps/api`
- Basic `greet` Rust command as demo
- Build/dev commands configured with Bun

**Missing:**
- All feature components
- SQLite integration
- Excel import/export logic
- State management

---

## Database Schema

Using **Tauri SQL Plugin** with SQLite. Schema designed for the feature requirements:

```sql
-- Matrices table
CREATE TABLE matrices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_imported INTEGER NOT NULL DEFAULT 0,  -- 0 = user-created, 1 = imported
  source_file TEXT,                         -- original filename if imported
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Matrix rows table
CREATE TABLE matrix_rows (
  id TEXT PRIMARY KEY,
  matrix_id TEXT NOT NULL,
  requirements TEXT NOT NULL DEFAULT '',
  experience_and_capability TEXT,           -- '0', '1', '2', '3', or NULL
  past_performance TEXT NOT NULL DEFAULT '',
  comments TEXT NOT NULL DEFAULT '',
  row_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (matrix_id) REFERENCES matrices(id) ON DELETE CASCADE
);

-- App settings (active matrix, etc.)
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

---

## Implementation Phases

### Phase 1: Foundation

**Objective:** Set up database, types, and styling infrastructure.

**Tasks:**
1. Install dependencies:
   - Frontend: `@tauri-apps/plugin-sql`, `@tauri-apps/plugin-dialog`, `exceljs`, `@heroicons/react`, `@dnd-kit/core`, `@dnd-kit/sortable`, `tailwindcss`
   - Backend: `tauri-plugin-sql` (sqlite), `tauri-plugin-dialog`

2. Configure Tauri SQL Plugin:
   - Add to `Cargo.toml`
   - Register plugin in `lib.rs` with migrations
   - Add permissions to `tauri.conf.json`

3. Create database migrations in `src-tauri/migrations/`

4. Set up Tailwind CSS:
   - `tailwind.config.js`, `postcss.config.js`
   - Replace default CSS with Tailwind

5. Create TypeScript types (`src/types/matrix.ts`)

6. Create database service layer (`src/lib/database.ts`)

**Files to create/modify:**
- `src-tauri/Cargo.toml`
- `src-tauri/src/lib.rs`
- `src-tauri/tauri.conf.json`
- `src-tauri/capabilities/default.json`
- `src-tauri/migrations/*.sql`
- `src/types/matrix.ts`
- `src/lib/database.ts`
- `tailwind.config.js`
- `postcss.config.js`
- `src/index.css`

---

### Phase 2: Core Matrix Editor

**Objective:** Build the primary matrix editing interface.

**Tasks:**
1. Create basic UI components:
   - Button, Input, Select, Dialog, Tabs

2. Create matrix components:
   - `MatrixEditor.tsx` - container with matrix selector
   - `MatrixTable.tsx` - TanStack Table with editable cells
   - `ScoreSelector.tsx` - dropdown for 0-3 scores
   - `ScoreBadge.tsx` - color-coded score display

3. Implement drag-and-drop row reordering with @dnd-kit

4. Implement custom hooks:
   - `useMatrices.ts` - CRUD operations, state management
   - `useActiveMatrix.ts` - active selection tracking

5. Features:
   - Create/delete matrices
   - Add/edit/delete rows
   - Drag-and-drop row reordering
   - Auto-save on cell changes
   - Switch between matrices

**Files to create:**
- `src/components/ui/*.tsx` (Button, Input, Select, Dialog, Tabs)
- `src/components/matrix/MatrixEditor.tsx`
- `src/components/matrix/MatrixTable.tsx`
- `src/components/matrix/ScoreSelector.tsx`
- `src/components/matrix/ScoreBadge.tsx`
- `src/hooks/useMatrices.ts`
- `src/hooks/useActiveMatrix.ts`
- `src/lib/utils.ts`

---

### Phase 3: Excel Import

**Objective:** Parse and import Excel files.

**Tasks:**
1. Create import parser (`src/lib/excel/importer.ts`):
   - Use `xlsx` (SheetJS) for parsing
   - Detect header row (search for "requirement")
   - Extract company name from file or metadata
   - Validate capability scores (0-3)
   - Handle multiple sheets per workbook

2. Create import UI:
   - `ImportTab.tsx` - file picker, preview list
   - `ImportPreview.tsx` - read-only table preview

3. Features:
   - Multi-file selection
   - Preview before import
   - Import individual or all
   - Remove from preview

**Files to create:**
- `src/lib/excel/importer.ts`
- `src/components/import/ImportTab.tsx`
- `src/components/import/ImportPreview.tsx`

---

### Phase 4: Excel Export

**Objective:** Generate formatted Excel files with conditional formatting.

**Tasks:**
1. Create export generator (`src/lib/excel/exporter.ts`):
   - Use `exceljs` for full styling support
   - Apply conditional formatting on score column
   - Include legend, metadata rows
   - Set column widths

2. Create export UI:
   - `ExportModal.tsx` - company name, date, version inputs
   - `ExportTab.tsx` - combines editor with export button

3. Use Tauri native file dialog for save location

**Files to create:**
- `src/lib/excel/exporter.ts`
- `src/components/export/ExportModal.tsx`
- `src/components/export/ExportTab.tsx`

---

### Phase 5: Comparison View

**Objective:** Side-by-side matrix comparison.

**Tasks:**
1. Create comparison data aggregator (`src/lib/comparison.ts`):
   - Collect unique requirements across matrices
   - Build score lookup by requirement + company

2. Create comparison UI:
   - `ComparisonTable.tsx` - dynamic columns per company
   - `ComparisonTooltip.tsx` - portal-rendered hover details

3. Features:
   - Color-coded score cells
   - Delete company column
   - Delete requirement row (from all matrices)
   - Statistics header
   - Horizontal scroll

**Files to create:**
- `src/lib/comparison.ts`
- `src/components/comparison/ComparisonTable.tsx`
- `src/components/comparison/ComparisonTooltip.tsx`

---

### Phase 6: Main App Integration

**Objective:** Combine all components into cohesive app.

**Tasks:**
1. Create main layout in `App.tsx`:
   - Header with app title
   - Comparison section (visible when matrices exist)
   - Tabs: Export | Import

2. Create context provider (`src/contexts/MatrixContext.tsx`)

3. Update window config:
   - Size: 1200x800
   - Title: "Capability Matrix Management"

4. Add empty states and confirmation dialogs

**Files to modify/create:**
- `src/App.tsx`
- `src/contexts/MatrixContext.tsx`
- `src-tauri/tauri.conf.json`

---

### Phase 7: Polish

**Objective:** Error handling, UX refinements.

**Tasks:**
1. Error boundaries and toast notifications
2. Empty state messages
3. Confirmation dialogs (delete matrix, clear all, etc.)
4. Keyboard navigation
5. Performance: debounced saves, memoization
6. Virtualize table if 100+ rows

---

## Score Color Mapping

| Score | Color | Hex | Description |
|-------|-------|-----|-------------|
| 3 | Blue | #4472C4 | Excellent capability |
| 2 | Green | #70AD47 | Good capability |
| 1 | Yellow | #FFC000 | Some capability |
| 0 | Gray | #E5E5E5 | No capability |

---

## Project Structure

```
src/
  App.tsx
  main.tsx
  index.css

  components/
    comparison/
      ComparisonTable.tsx
      ComparisonTooltip.tsx
    export/
      ExportTab.tsx
      ExportModal.tsx
    import/
      ImportTab.tsx
      ImportPreview.tsx
    matrix/
      MatrixEditor.tsx
      MatrixTable.tsx
      ScoreSelector.tsx
      ScoreBadge.tsx
    ui/
      Button.tsx
      Input.tsx
      Select.tsx
      Dialog.tsx
      Tabs.tsx

  contexts/
    MatrixContext.tsx

  hooks/
    useMatrices.ts
    useActiveMatrix.ts

  lib/
    database.ts
    comparison.ts
    utils.ts
    excel/
      importer.ts
      exporter.ts

  types/
    matrix.ts

src-tauri/
  src/
    lib.rs
    main.rs
  Cargo.toml
  tauri.conf.json
  capabilities/
    default.json
  migrations/
    001_create_tables.sql
```

---

## Dependencies to Add

**Frontend (bun add):**
```bash
bun add @tauri-apps/plugin-sql @tauri-apps/plugin-dialog exceljs @heroicons/react @dnd-kit/core @dnd-kit/sortable
bun add -D tailwindcss postcss autoprefixer
```

**Backend (Cargo.toml):**
```toml
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
tauri-plugin-dialog = "2"
```

---

## Design Decisions

1. **Row reordering:** Drag-and-drop enabled using @dnd-kit

2. **Export file location:** Native Tauri file dialog for user to choose save location

3. **Undo/redo:** Not implemented (keep simple)

4. **Performance:** Virtualize table if 100+ rows

5. **Excel libraries:**
   - `xlsx` (SheetJS) for importing - robust parsing
   - `exceljs` for exporting - full styling and conditional formatting support

6. **State management:** React Context + useReducer (simple, sufficient for this app)

7. **Styling:** Tailwind CSS with custom UI components (no shadcn/ui)
