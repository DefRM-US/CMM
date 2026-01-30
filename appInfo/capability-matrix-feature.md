# Capability Matrix Feature Documentation

This document describes the Capability Matrix feature for extracting it into an independent application.

## 1. Feature Overview

### Purpose

The Capability Matrix is a tool for defense contractors to track and compare capability requirements across multiple companies when responding to RFPs (Requests for Proposal). It enables users to:

- Document requirements from a PWS (Performance Work Statement)
- Rate their company's experience and capability against each requirement (0-3 scale)
- Track past performance references and comments for each requirement
- Import competitor capability matrices from Excel spreadsheets
- Compare capability scores across multiple companies in a unified view

### Key Value Proposition

- Centralizes RFP requirement tracking in one place
- Enables side-by-side competitive analysis
- Supports Excel import/export for compatibility with existing workflows
- Provides visual color-coded comparison for quick assessment

---

## 2. Data Models & Types

### CapabilityMatrixRow

Represents a single requirement with its capability assessment.

```
CapabilityMatrixRow {
  id: string                           // Unique identifier (e.g., "row-1705123456789-0")
  requirements: string                 // The requirement text from the RFP/PWS
  experienceAndCapability: string|null // Score: '0', '1', '2', or '3' (null if unset)
  pastPerformance: string              // Past performance reference text
  comments: string                     // Additional notes/comments
}
```

### CapabilityMatrix

A named collection of requirement rows with metadata.

```
CapabilityMatrix {
  id: string                    // Unique identifier (e.g., "matrix-1705123456789")
  name: string                  // Display name (e.g., "Company A", "Our Response")
  rows: CapabilityMatrixRow[]   // Array of requirement rows
  createdAt: string             // ISO timestamp of creation
  updatedAt: string             // ISO timestamp of last modification
}
```

### MatricesStorage

Container for managing multiple matrices with an active selection.

```
MatricesStorage {
  matrices: CapabilityMatrix[]  // All matrices for this context
  activeMatrixId: string|null   // ID of currently selected matrix for editing
}
```

### TooltipState (for Comparison View)

State structure for showing additional details on hover in the comparison table.

```
TooltipState {
  requirement: string      // The requirement being hovered
  company: string          // The company name
  pastPerformance: string  // Past performance text to display
  comments: string         // Comments text to display
  x: number                // Screen X coordinate
  y: number                // Screen Y coordinate
}
```

---

## 3. User Workflows

### 3.1 Creating & Editing Matrices

**Initial State**

- When a user first accesses the feature, no matrices exist
- User clicks "New Matrix" to create their first matrix
- New matrices start with 10 empty rows by default
- Matrix is auto-named (e.g., "Matrix 1", "Matrix 2")

**Editing Data**

- Each row displays 4 editable fields in a table format:
  - **Requirements**: Text input for the requirement description
  - **Experience and Capability**: Dropdown selector (0, 1, 2, or 3)
  - **Past Performance**: Text input for past performance references
  - **Comments**: Text input for additional notes
- Changes are auto-saved after each cell edit (persisted to storage)

**Managing Rows**

- "Add Row" button appends a new empty row
- Trash icon on each row deletes that row
- "Clear All" resets the matrix to 10 empty rows (with confirmation)

**Managing Matrices**

- Dropdown selector to switch between matrices
- "New Matrix" creates additional matrices
- "Delete Matrix" removes the current matrix (with confirmation)

### 3.2 Exporting to Excel

**Export Workflow**

1. User clicks "Export" button in the Export tab
2. Modal dialog opens with:
   - Company Name field (required)
   - Date field (defaults to current date)
   - Version field (defaults to "1.0")
3. Preview table shows current matrix data with color-coded capability scores
4. User clicks "Export to Excel" to download

**Output**

- Downloads an `.xlsx` file named: `Capability_Matrix_{CompanyName}_{Date}.xlsx`
- File contains formatted data with conditional formatting and legend

### 3.3 Importing from Excel

**Import Workflow**

1. User switches to "Import Matrices" tab
2. Clicks "Choose Excel File(s)" button
3. Selects one or more `.xlsx` or `.xls` files
4. System parses files and displays preview for each detected matrix
5. User can:
   - Import individual matrices one at a time
   - Import all matrices at once
   - Remove unwanted matrices from preview
   - Add more files to the import batch
6. Imported matrices are stored in a separate namespace from user-created matrices

**Parsing Behavior**

- Supports multiple sheets per workbook (each becomes a separate matrix)
- Auto-detects header row by searching for "requirement" keyword
- Extracts company name from "Company Name" field if present
- Falls back to filename (and sheet name for multi-sheet files)

### 3.4 Comparison View

**Grand Comparison Table**

- Displays automatically when any matrices exist (user-created or imported)
- Shows a grid with:
  - Rows = All unique requirements across all matrices
  - Columns = Company names (matrix names)
  - Cells = Color-coded capability scores (0-3)

**Interactions**

- **Hover**: Shows tooltip with Past Performance and Comments for that cell
- **Delete Company**: Trash icon in column header removes that matrix
- **Delete Requirement**: Trash icon on row removes that requirement from ALL matrices

**Statistics**

- Header shows count: "Comparing X requirements across Y companies"

---

## 4. Excel Format Specifications

### 4.1 Export Format

**File Structure**

```
Row 1:   [Title: "Draft PWS - Capability Matrix"]  [empty]  [3]  [Legend: "Excellent capability..."]
Row 2:   [empty]                                   [empty]  [2]  [Legend: "Good capability..."]
Row 3:   [empty]                                   [empty]  [1]  [Legend: "Some capability..."]
Row 4:   [empty]                                   [empty]  [0]  [Legend: "No capability"]
Row 5:   [Company Name]  [Value entered by user]
Row 6:   [Date]          [Value entered by user]
Row 7:   [Version]       [Value entered by user]
Row 8:   [empty]
Row 9:   [Requirements]  [Experience and Capability]  [Past Performance]  [Comments]   <- Headers
Row 10+: [Data rows...]
```

**Column Widths**

- Column A (Requirements): 50 characters
- Column B (Experience/Capability): 25 characters
- Column C (Past Performance): 30 characters
- Column D (Comments): 80 characters

**Color Coding (ARGB format)**
| Score | Background | Text Color | Description |
|-------|------------|------------|-------------|
| 3 | #4472C4 (Blue) | White | Excellent capability |
| 2 | #70AD47 (Green) | White | Good capability |
| 1 | #FFC000 (Yellow) | Black | Some capability |
| 0 | #FFFFFF (White) | Black | No capability |

**Legend Text**

- 3: "Excellent capability - significant experience and past performance inputs; applicable to NITE SOW"
- 2: "Good capability - significant experience and past performance inputs; applicable to NITE SOW and executed on other than Training programs but on related platforms"
- 1: "Some capability - minor or scattered experience"
- 0: "No capability"

**Conditional Formatting**

- Applied to Experience/Capability column (Column B)
- Rules check cell value (0, 1, 2, 3) and apply corresponding fill color
- Formatting works when values are changed in the spreadsheet

### 4.2 Import Format

**Expected Column Structure**
| Column | Field | Required | Notes |
|--------|-------|----------|-------|
| A | Requirements | Yes | Text describing the requirement |
| B | Experience and Capability | No | Must be 0, 1, 2, or 3 if provided |
| C | Past Performance | No | Text field |
| D | Comments | No | Text field |

**Header Detection**

- Scans first 30 rows looking for a row containing "requirement" (case-insensitive)
- Data rows start immediately after the header row
- If no header found, assumes data starts at row 2 (skipping potential title)

**Company Name Extraction**

- Scans first 20 rows for pattern: [Company Name] [Value]
- If found, uses the value as the matrix name
- Falls back to: `{filename}` or `{filename} - {sheetName}` for multi-sheet files

**Value Validation**

- Experience/Capability values must be exactly '0', '1', '2', or '3'
- Invalid values are converted to null
- Empty requirements rows are skipped

---

## 5. Storage Architecture

### Storage Keys

Two separate localStorage namespaces per context (e.g., per deal):

| Key Pattern                                | Contents               | Purpose                      |
| ------------------------------------------ | ---------------------- | ---------------------------- |
| `deal-capability-matrix-{dealId}`          | MatricesStorage object | User-created/edited matrices |
| `deal-capability-matrix-imported-{dealId}` | CapabilityMatrix[]     | Imported matrices            |

### Format Migration

The system handles legacy data formats:

- If stored data is a plain array (old format), it wraps it in a "Default Matrix"
- Migrated data is saved back in the new MatricesStorage format

### Storage Operations

- **Load**: Parse JSON from localStorage, handle errors gracefully
- **Save**: Serialize to JSON and store, show error alert on failure
- **Auto-save**: Every cell edit triggers an immediate save

### Isolation

- Data is isolated by context ID (dealId in the current implementation)
- No cross-context data sharing
- No user-level isolation (multiple users on same browser share data)

---

## 6. Capability Score Legend

| Score | Color            | Visual              | Description                                                                                                          |
| ----- | ---------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 3     | Blue (#4472C4)   | Filled circle/badge | **Excellent capability** - Significant experience and past performance inputs directly applicable to the requirement |
| 2     | Green (#70AD47)  | Filled circle/badge | **Good capability** - Significant experience and past performance on related platforms or programs                   |
| 1     | Yellow (#FFC000) | Filled circle/badge | **Some capability** - Minor or scattered experience                                                                  |
| 0     | Gray (#E5E5E5)   | Filled circle/badge | **No capability** - No relevant experience                                                                           |

**Display in UI**

- Scores appear as colored badges (8x8 rounded squares)
- White text on blue/green backgrounds
- Black text on yellow/gray backgrounds
- "-" displayed when score is undefined/null

---

## 7. UI Components Overview

### Component Hierarchy

```
DealTabs (parent container)
  └── DealCapabilityMatrix (main feature component)
        ├── Grand Comparison Table
        ├── Matrix Selector (dropdown)
        ├── Export/Import Tabs
        │     ├── Export Tab
        │     │     ├── Action buttons (Save, Export, Clear All, Add Row)
        │     │     └── Editable data table
        │     └── Import Tab
        │           ├── File upload area
        │           ├── Preview tables
        │           └── Import buttons
        └── CapabilityMatrixExportModal (export dialog)
```

### Tab Structure

| Tab             | Purpose                               |
| --------------- | ------------------------------------- |
| Export          | Edit and export user-created matrices |
| Import Matrices | Upload and preview Excel imports      |

### Table Patterns

**Editable Table (Export Tab)**

- Fixed 5-column layout
- Input fields for text columns
- Dropdown for capability score
- Delete button per row
- "Add Row" button at bottom

**Preview Table (Import Tab)**

- Read-only display
- Shows first 10 rows with overflow indicator
- Color-coded capability scores
- Per-matrix import/remove buttons

**Comparison Table**

- Dynamic columns based on company count
- Scrollable horizontally
- Delete buttons in headers and row labels
- Hover tooltips via React portal

### Portal-Based Tooltips

- Rendered directly to document.body to avoid overflow clipping
- Positioned using mouse coordinates
- Shows Past Performance and Comments on hover
- Arrow indicator pointing to source element

---

## 8. Dependencies

### Excel Processing

| Package   | Version | Purpose                               |
| --------- | ------- | ------------------------------------- |
| `exceljs` | ^4.4.0  | Creating and formatting Excel exports |
| `xlsx`    | ^0.18.5 | Parsing Excel imports (SheetJS)       |

### UI Components

| Library                  | Usage                                                                      |
| ------------------------ | -------------------------------------------------------------------------- |
| shadcn/ui                | Table, Input, Button, Select, Dialog, Tabs, Label components               |
| @heroicons/react         | Icons (TrashIcon, PlusIcon, CheckIcon, ArrowDownTrayIcon, ArrowUpTrayIcon) |
| Tailwind CSS             | Styling and responsive layout                                              |
| React DOM (createPortal) | Tooltip rendering                                                          |

---

## 9. Considerations for Independent App

### Storage

The current implementation uses browser localStorage which:

- Does not sync across devices
- Has no user authentication/authorization
- Limited to ~5-10MB depending on browser
- Data lost if browser storage is cleared

**Recommendations for production:**

- Implement backend API with database storage
- Add user authentication for data isolation
- Consider real-time sync capabilities

### Multi-tenancy

Current design isolates by `dealId`. For a standalone app, consider:

- Project/workspace concept to group matrices
- Team sharing and permissions
- Activity logging/audit trail

### Excel Compatibility

The export format is tested with:

- Microsoft Excel
- Google Sheets
- LibreOffice Calc

Conditional formatting may render differently across applications.

### Performance

- Large matrices (100+ requirements, 10+ companies) may slow the comparison table
- Consider pagination or virtualization for scale
- Excel parsing is done client-side (may block UI for large files)
