# CMM Implementation Plan

## Overview

Transform the Capability Matrix feature from an existing web app into a standalone Tauri v2 desktop application. The app enables defense contractors to track capability requirements, rate their capabilities (0-3), and compare scores across companies.

---

## Current State

**Completed (Phase 1 + Phase 2 + Phase 3 + Phase 4 + Phase 5):**
- Tauri v2 + React 19 + Vite scaffold
- All dependencies installed (frontend + backend)
- SQLite integration with Tauri SQL plugin configured
- Database migrations created and auto-run on startup
- Tailwind CSS v4 configured with custom score colors
- TypeScript types defined (`src/types/matrix.ts`)
- Database service layer implemented (`src/lib/database.ts`)
- Core matrix editor UI with TanStack Table
- Drag-and-drop row reordering with @dnd-kit
- State management with React Context + useReducer
- Auto-save with 500ms debounce
- Confirmation dialogs for delete actions
- Excel import functionality with file picker and preview
- Tab navigation between Editor, Import, Export, and Compare views
- Parent-child matrix linking for imported matrices
- Excel export with ExcelJS (conditional formatting, legend, metadata)
- Tauri fs plugin for file writing
- Comparison view with side-by-side matrix comparison
- Hide/show company toggles (session-persisted)
- Delete company/requirement with confirmation dialogs
- Undo toast for requirement deletions
- Hover tooltips showing past performance and comments

**Ready for Phase 6/7:**
- All four tabs fully functional
- Comparison data aggregation with exact requirement matching
- Toast component available for notifications

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
  parent_matrix_id TEXT,                    -- links imported matrices to their template (Phase 3)
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (parent_matrix_id) REFERENCES matrices(id) ON DELETE CASCADE
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

### Phase 1: Foundation ✅ COMPLETE

**Objective:** Set up database, types, and styling infrastructure.

**Tasks:**
1. ✅ Install dependencies:
   - Frontend: `@tauri-apps/plugin-sql`, `@tauri-apps/plugin-dialog`, `exceljs`, `@heroicons/react`, `@dnd-kit/core`, `@dnd-kit/sortable`, `tailwindcss`
   - Backend: `tauri-plugin-sql` (sqlite), `tauri-plugin-dialog`

2. ✅ Configure Tauri SQL Plugin:
   - Add to `Cargo.toml`
   - Register plugin in `lib.rs` with migrations
   - Add permissions to `capabilities/default.json`

3. ✅ Create database migrations in `src-tauri/migrations/`

4. ✅ Set up Tailwind CSS v4:
   - `postcss.config.js` with `@tailwindcss/postcss`
   - `src/index.css` with `@import "tailwindcss"` and `@theme` for custom colors

5. ✅ Create TypeScript types (`src/types/matrix.ts`)

6. ✅ Create database service layer (`src/lib/database.ts`)

7. ✅ Create utility functions (`src/lib/utils.ts`)

**Files created/modified:**
- `src-tauri/Cargo.toml` - added tauri-plugin-sql, tauri-plugin-dialog
- `src-tauri/src/lib.rs` - registered plugins with migrations
- `src-tauri/capabilities/default.json` - added sql and dialog permissions
- `src-tauri/migrations/001_create_tables.sql` - database schema
- `src/types/matrix.ts` - TypeScript interfaces and SCORE_CONFIG
- `src/lib/database.ts` - full CRUD operations for matrices/rows/settings
- `src/lib/utils.ts` - cn(), generateId(), formatDate(), debounce()
- `postcss.config.js` - Tailwind v4 PostCSS config
- `src/index.css` - Tailwind directives and component classes
- `src/App.tsx` - placeholder with Tailwind styling
- `src/main.tsx` - imports index.css

**Implementation Notes:**
- Tailwind v4 requires `@tailwindcss/postcss` plugin (not direct tailwindcss)
- Score colors defined as CSS custom properties in `@theme` block
- Database path is `sqlite:cmm.db` - stored in Tauri app data directory
- Theme toggle feature will be added in Phase 2 (app_settings table ready)

---

### Phase 2: Core Matrix Editor ✅ COMPLETE

**Objective:** Build the primary matrix editing interface.

**Tasks:**
1. ✅ Create basic UI components:
   - Button, Input, Select, Dialog (Tabs deferred - not needed yet)

2. ✅ Create matrix components:
   - `MatrixEditor.tsx` - container with matrix selector
   - `MatrixTable.tsx` - TanStack Table with editable cells
   - `ScoreSelector.tsx` - dropdown for 0-3 scores
   - `ScoreBadge.tsx` - color-coded score display

3. ✅ Implement drag-and-drop row reordering with @dnd-kit

4. ✅ Implement custom hooks:
   - `useMatrices.ts` - CRUD operations, state management
   - `useActiveMatrix.ts` - active selection tracking
   - `useDebouncedSave.ts` - auto-save with debouncing

5. ✅ Features:
   - Create/delete matrices (with confirmation dialogs)
   - Add/edit/delete rows (with confirmation dialogs)
   - Drag-and-drop row reordering
   - Auto-save on cell changes (500ms debounce)
   - Switch between matrices via dropdown
   - Inline matrix name editing (double-click)
   - Empty state with "Create Your First Matrix" prompt

**Files created:**
- `src/components/ui/Button.tsx` - variants: primary, secondary, danger
- `src/components/ui/Input.tsx` - forwardRef wrapper for input element
- `src/components/ui/Select.tsx` - dropdown with options array
- `src/components/ui/Dialog.tsx` - modal using HTML dialog element + portal
- `src/components/matrix/ScoreBadge.tsx` - color-coded score display
- `src/components/matrix/ScoreSelector.tsx` - dropdown with score options
- `src/components/matrix/EditableCell.tsx` - double-click to edit, textarea
- `src/components/matrix/DraggableRow.tsx` - @dnd-kit sortable row wrapper
- `src/components/matrix/MatrixTable.tsx` - TanStack Table with DnD context
- `src/components/matrix/InlineEditableName.tsx` - double-click to rename
- `src/components/matrix/MatrixToolbar.tsx` - matrix selector + new/delete buttons
- `src/components/matrix/EmptyState.tsx` - empty state prompt
- `src/components/matrix/MatrixEditor.tsx` - main container component
- `src/contexts/MatrixContext.tsx` - state management with useReducer
- `src/hooks/useMatrices.ts` - matrix list operations
- `src/hooks/useActiveMatrix.ts` - active matrix + row operations
- `src/hooks/useDebouncedSave.ts` - debounced database saves

**Files modified:**
- `src/App.tsx` - wrapped with MatrixProvider, renders MatrixEditor

**Implementation Notes:**
- New matrices start with 1 empty row (user preference)
- Dark mode deferred to Phase 7 (polish)
- TanStack Table used for data grid (not custom table)
- EditableCell uses textarea (supports multi-line) with double-click activation
- Confirmation dialogs for both matrix and row deletion
- Active matrix ID persisted to app_settings for session restore
- Optimistic updates with error recovery (reload on failure)

---

### Phase 3: Excel Import ✅ COMPLETE

**Objective:** Parse and import Excel files.

**Tasks:**
1. ✅ Create import parser (`src/lib/excel/importer.ts`):
   - Use `xlsx` (SheetJS) for parsing
   - Detect header row (search for "requirement")
   - Extract company name from file or metadata
   - Validate capability scores (0-3)
   - Handle multiple sheets per workbook

2. ✅ Create import UI:
   - `ImportTab.tsx` - file picker, preview list
   - `ImportPreview.tsx` - read-only table preview

3. ✅ Features:
   - Multi-file selection
   - Preview before import
   - Import individual or all
   - Remove from preview

4. ✅ Schema change for parent-child matrix linking:
   - Added `parent_matrix_id` column to matrices table
   - Created migration `002_add_parent_matrix.sql`

**Files created:**
- `src-tauri/migrations/002_add_parent_matrix.sql` - schema migration
- `src/lib/excel/importer.ts` - Excel parsing with xlsx library
- `src/components/import/ImportTab.tsx` - main import UI with file picker
- `src/components/import/ImportPreview.tsx` - preview table with ScoreBadge
- `src/components/ui/Tabs.tsx` - reusable tab navigation component

**Files modified:**
- `src/types/matrix.ts` - added `parentMatrixId` to interfaces
- `src/lib/database.ts` - added `parentMatrixId` support, `getChildMatrices()`, `getTemplateMatrices()`
- `src/App.tsx` - added Tabs, ImportTab integration

**Implementation Notes:**
- Imported matrices are linked to their parent template via `parentMatrixId`
- Each import creates a NEW matrix (not merging into existing)
- File reading uses `convertFileSrc` + `fetch` for Tauri webview compatibility
- After import, automatically switches to Editor tab and selects the imported matrix
- Header detection scans first 30 rows for "requirement" keyword
- Company name extracted from metadata or falls back to filename
- Multi-sheet workbooks create separate matrices per sheet
- Invalid scores become `null` (displayed as "-" badge)

---

### Phase 4: Excel Export ✅ COMPLETE

**Objective:** Generate formatted Excel files with conditional formatting.

**Tasks:**
1. ✅ Create export generator (`src/lib/excel/exporter.ts`):
   - Use `exceljs` for full styling support
   - Apply conditional formatting on score column
   - Include legend, metadata rows
   - Set column widths

2. ✅ Create export UI:
   - `ExportModal.tsx` - company name, date, version inputs (pre-filled with defaults)
   - `ExportTab.tsx` - preview table with export button
   - `ExportPreview.tsx` - read-only table preview with ScoreBadge

3. ✅ Use Tauri native file dialog for save location
4. ✅ Added Tauri fs plugin for file writing

**Files created:**
- `src/lib/excel/exporter.ts` - Excel generation with ExcelJS
- `src/components/export/ExportTab.tsx` - main export UI with preview
- `src/components/export/ExportModal.tsx` - metadata form dialog
- `src/components/export/ExportPreview.tsx` - read-only preview table

**Files modified:**
- `src/App.tsx` - added Export tab (third tab)
- `src-tauri/Cargo.toml` - added `tauri-plugin-fs`
- `src-tauri/src/lib.rs` - registered fs plugin
- `src-tauri/capabilities/default.json` - added `fs:default`, `fs:allow-write`
- `package.json` - added `@tauri-apps/plugin-fs`

**Implementation Notes:**
- Export uses `@tauri-apps/plugin-dialog` `save()` for native file picker
- File writing uses `@tauri-apps/plugin-fs` `writeFile()` with Uint8Array buffer
- ExcelJS workbook structure:
  - Rows 1-4: Title + color-coded legend (scores 3, 2, 1, 0 with descriptions)
  - Rows 5-7: Metadata (Company Name, Date, Version)
  - Row 8: Empty spacer
  - Row 9: Headers (Requirements, Experience and Capability, Past Performance, Comments)
  - Row 10+: Data rows with conditional formatting on score column
- Column widths: A=50, B=25, C=30, D=80 characters
- Score colors use ARGB format for ExcelJS (e.g., `FF4472C4` for blue)
- Conditional formatting applied to Column B so colors persist when users edit in Excel
- Modal pre-fills: Company Name = matrix name, Date = today, Version = "1.0"
- Preview shows first 10 rows with "...and X more rows" indicator

---

### Phase 5: Comparison View ✅ COMPLETE

**Objective:** Side-by-side matrix comparison.

**Tasks:**
1. ✅ Create comparison data aggregator (`src/lib/comparison.ts`):
   - Collect unique requirements across matrices
   - Build score lookup by requirement + company

2. ✅ Create comparison UI:
   - `ComparisonTab.tsx` - main container with hide/show state
   - `ComparisonTable.tsx` - dynamic columns per company
   - `ComparisonTooltip.tsx` - portal-rendered hover details

3. ✅ Features:
   - Color-coded score cells (reuses ScoreBadge)
   - Delete company column (with confirmation)
   - Delete requirement row from all matrices (with confirmation showing affected companies)
   - Statistics header ("Comparing X requirements across Y companies")
   - Hide/show company toggles (session-persisted)
   - Horizontal scroll with sticky requirements column
   - Undo toast for requirement deletions

**Files created:**
- `src/lib/comparison.ts` - types and buildComparisonData function
- `src/components/comparison/ComparisonTab.tsx` - main orchestrating component
- `src/components/comparison/ComparisonTable.tsx` - comparison grid
- `src/components/comparison/ComparisonTooltip.tsx` - hover details
- `src/components/comparison/index.ts` - barrel export
- `src/components/ui/Toast.tsx` - undo notification component

**Files modified:**
- `src/App.tsx` - added "Compare" tab
- `src/lib/database.ts` - added `deleteRowsByRequirement()` and `restoreRows()` for undo

**Implementation Notes:**
- Requirements matched using exact text (case-insensitive, trimmed)
- Hide state persists during app session (React state), resets on restart
- Tooltip shows Past Performance and Comments on cell hover
- Delete requirement confirmation lists which companies have data in that row
- Undo toast appears for 5 seconds after requirement deletion

---

### Phase 6: Main App Integration ✅ COMPLETE

**Objective:** Combine all components into cohesive app.

**Tasks:**
1. ✅ (Done in Phase 2-5) Create main layout in `App.tsx`:
   - Header with app title
   - MatrixEditor as main content
   - ✅ Comparison tab added (Phase 5)
   - ✅ Tabs for Editor | Import | Export | Compare navigation

2. ✅ (Done in Phase 2) Create context provider (`src/contexts/MatrixContext.tsx`)

3. ⏳ Update window config:
   - Size: 1200x800
   - Title: "Capability Matrix Management"

4. ✅ (Done in Phase 2) Add empty states and confirmation dialogs

**Files to modify/create:**
- ✅ `src/App.tsx` - Tabs complete (Editor, Import, Export, Compare)
- ✅ `src/components/ui/Tabs.tsx` - tab navigation component created in Phase 3
- ⏳ `src-tauri/tauri.conf.json` - update window size (minor task)

**Notes for Implementation:**
- MatrixContext already created and working
- App.tsx structure complete with 3 tabs
- Comparison view will be added in Phase 5 - consider:
  - Adding as 4th tab: "Comparison"
  - Or showing above tabs when 2+ matrices exist
- Tab pattern established: controlled tabs with `activeTab` state, typed `TabValue`

---

### Phase 7: Polish

**Objective:** Error handling, UX refinements.

**Tasks:**
1. Error boundaries and toast notifications
2. ✅ (Done in Phase 2) Empty state messages
3. ✅ (Done in Phase 2) Confirmation dialogs (delete matrix, delete row)
4. Keyboard navigation (Tab between cells, Enter to save)
5. ✅ (Done in Phase 2) Performance: debounced saves (500ms)
6. Virtualize table if 100+ rows (use @tanstack/react-virtual)
7. Dark mode toggle (app_settings table ready)

**Notes for Implementation:**
- Error display exists in MatrixEditor but could use toast notifications
- Consider adding keyboard shortcuts (Ctrl+N for new matrix, etc.)
- TanStack Table supports virtualization - may need to refactor MatrixTable
- Dark mode: add theme context, CSS variables for dark colors, toggle in header

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
  App.tsx                          ✅ Created (updated Phase 5)
  main.tsx                         ✅ Created
  index.css                        ✅ Created

  components/
    comparison/
      ComparisonTab.tsx            ✅ Created (Phase 5)
      ComparisonTable.tsx          ✅ Created (Phase 5)
      ComparisonTooltip.tsx        ✅ Created (Phase 5)
      index.ts                     ✅ Created (Phase 5)
    export/
      ExportTab.tsx                ✅ Created (Phase 4)
      ExportModal.tsx              ✅ Created (Phase 4)
      ExportPreview.tsx            ✅ Created (Phase 4)
    import/
      ImportTab.tsx                ✅ Created (Phase 3)
      ImportPreview.tsx            ✅ Created (Phase 3)
    matrix/
      MatrixEditor.tsx             ✅ Created
      MatrixTable.tsx              ✅ Created
      MatrixToolbar.tsx            ✅ Created
      ScoreSelector.tsx            ✅ Created
      ScoreBadge.tsx               ✅ Created
      EditableCell.tsx             ✅ Created
      DraggableRow.tsx             ✅ Created
      InlineEditableName.tsx       ✅ Created
      EmptyState.tsx               ✅ Created
    ui/
      Button.tsx                   ✅ Created
      Input.tsx                    ✅ Created
      Select.tsx                   ✅ Created
      Dialog.tsx                   ✅ Created
      Tabs.tsx                     ✅ Created (Phase 3)
      Toast.tsx                    ✅ Created (Phase 5)

  contexts/
    MatrixContext.tsx              ✅ Created

  hooks/
    useMatrices.ts                 ✅ Created
    useActiveMatrix.ts             ✅ Created
    useDebouncedSave.ts            ✅ Created

  lib/
    database.ts                    ✅ Created (updated Phase 5)
    comparison.ts                  ✅ Created (Phase 5)
    utils.ts                       ✅ Created
    excel/
      importer.ts                  ✅ Created (Phase 3)
      exporter.ts                  ✅ Created (Phase 4)

  types/
    matrix.ts                      ✅ Created (updated Phase 3)

src-tauri/
  src/
    lib.rs                         ✅ Created (updated Phase 4 - fs plugin)
    main.rs                        ✅ Created
  Cargo.toml                       ✅ Created (updated Phase 4 - fs plugin)
  tauri.conf.json                  ✅ Created
  capabilities/
    default.json                   ✅ Created (updated Phase 4 - fs permissions)
  migrations/
    001_create_tables.sql          ✅ Created
    002_add_parent_matrix.sql      ✅ Created (Phase 3)
```

---

## Dependencies ✅ INSTALLED

**Frontend (package.json):**
- `@tauri-apps/plugin-sql` - SQLite database access
- `@tauri-apps/plugin-dialog` - Native file dialogs
- `@tauri-apps/plugin-fs` - File system access (Phase 4)
- `exceljs` - Excel export with styling
- `xlsx` - Excel import parsing (SheetJS)
- `@heroicons/react` - Icons
- `@dnd-kit/core`, `@dnd-kit/sortable` - Drag-and-drop
- `@tanstack/react-table` - Data grid
- `tailwindcss`, `@tailwindcss/postcss`, `postcss`, `autoprefixer` - Styling

**Backend (Cargo.toml):**
- `tauri-plugin-sql` with sqlite feature
- `tauri-plugin-dialog`
- `tauri-plugin-fs` (Phase 4)

---

## Design Decisions

1. **Row reordering:** Drag-and-drop enabled using @dnd-kit (✅ implemented)
   - Uses PointerSensor with 5px activation distance
   - SortableContext with verticalListSortingStrategy
   - Optimistic UI updates with database persistence

2. **Export file location:** Native Tauri file dialog for user to choose save location (✅ implemented Phase 4)
   - Uses `@tauri-apps/plugin-dialog` `save()` for native file picker
   - Uses `@tauri-apps/plugin-fs` `writeFile()` for writing
   - Suggested filename: `Capability_Matrix_{CompanyName}_{Date}.xlsx`

3. **Undo/redo:** Not implemented (keep simple)

4. **Performance:**
   - Debounced auto-save (500ms) to reduce database writes (✅ implemented)
   - Virtualize table if 100+ rows (Phase 7)

5. **Excel libraries:**
   - `xlsx` (SheetJS) for importing - robust parsing
   - `exceljs` for exporting - full styling and conditional formatting support

6. **State management:** React Context + useReducer (✅ implemented)
   - MatrixContext provides state and dispatch
   - useMatrices hook for matrix list operations
   - useActiveMatrix hook for active matrix + row operations
   - useDebouncedSave hook for batched database writes

7. **Styling:** Tailwind CSS v4 with custom UI components (no shadcn/ui) (✅ implemented)
   - Custom Button, Input, Select, Dialog components
   - Score colors as CSS custom properties
   - Reusable component classes in index.css

8. **Dark mode:** User-toggleable (stored in app_settings table, deferred to Phase 7)

9. **Cell editing:** Double-click to edit pattern (✅ implemented)
   - EditableCell component with textarea for multi-line support
   - Enter to save, Escape to cancel
   - Blur also triggers save

10. **New matrices:** Start with 1 empty row (user preference, ✅ implemented)
