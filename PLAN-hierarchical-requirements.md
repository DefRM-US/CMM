# Plan: Hierarchical Requirement Numbering

## Current State

Requirements are currently stored as flat rows with:
- Sequential `rowOrder` field (0, 1, 2, ...)
- Display shows simple `row.index + 1` (1, 2, 3, ...)
- No concept of parent/child relationships
- No persistent requirement numbers (numbering is positional)

**Key files:**
- `src/types/matrix.ts:14-29` - Row type definition
- `src/components/matrix/MatrixTable.tsx:221-231` - Number display
- `src-tauri/migrations/001_create_tables.sql:12-21` - Database schema

---

## Goal

Support hierarchical requirement numbering like:
```
1. Main requirement
1.1 Sub requirement
1.2 Sub requirement
1.2.1 Sub-sub requirement
2. Main requirement
```

---

## Design Decisions

### Option A: Store explicit requirement numbers as text
Store the number (e.g., "1.2.1") directly in a new `requirementNumber` field.

**Pros:**
- Simple to implement
- Numbers survive reordering independently
- Direct mapping to source documents (RFPs often have their own numbering)
- No complex recalculation needed

**Cons:**
- Manual entry/editing of numbers
- No automatic renumbering on insert/delete
- Potential for duplicates or gaps

### Option B: Store parent ID and derive numbers
Add a `parentId` field to create a tree structure, compute numbers from hierarchy.

**Pros:**
- Automatic numbering from structure
- Easy to insert/move items (numbers auto-adjust)
- Maintains hierarchy relationships for filtering/grouping

**Cons:**
- Complex number calculation logic
- Numbers change when items move (may not match source document)
- More complex drag-and-drop and reordering logic
- Tree traversal overhead

### Option C: Hybrid - store both explicit number AND level/parent
Store user-entered requirement number but also track hierarchy level for indentation.

**Pros:**
- Preserves original document numbering
- Visual hierarchy with indentation
- Flexibility to match any numbering scheme

**Cons:**
- Some redundancy
- Must keep level and number in sync

---

## Chosen Approach: Option A (Explicit Numbers) ✓

**Rationale:**
1. Defense RFPs have their own numbering schemes that users need to preserve
2. Requirements often come from external documents where numbering is fixed
3. Auto-renumbering would break references to source documents
4. Simple to implement and understand
5. **Allows handling RFP mistakes** - if source document has gaps/errors in numbering, user can still enter it correctly

---

## Resolved Decisions

| Question | Decision |
|----------|----------|
| Keep sequential row number column? | **No** - Remove it. Hierarchical numbers are sufficient; showing both would be confusing. |
| Auto-numbering behavior? | **Yes** - Auto-suggest next number. Use Tab to indent (add sublevel), Shift+Tab to outdent. |
| Sorting? | **By requirement number** with natural sort (1.2 < 1.10 < 2) |
| Validation? | **Enforce format** - Must be numeric with dots (e.g., "1", "1.2", "1.2.3"). Warn on invalid format. |
| Comparison matching? | **Both** - Match by number AND text. On import conflicts, show user dialog to resolve. |
| Bulk entry? | **Deferred** - Not in initial release. |

---

## Implementation Plan

### Phase 1: Data Model Changes

**1.1 Add `requirementNumber` field to type definition**
```typescript
// src/types/matrix.ts
export interface CapabilityMatrixRow {
  id: string;
  matrixId: string;
  requirementNumber: string;  // NEW: e.g., "1.2.1", "3.2"
  requirements: string;
  experienceAndCapability: Score;
  pastPerformance: string;
  comments: string;
  rowOrder: number;
}
```

**1.2 Database migration**
```sql
-- New migration file: 002_add_requirement_number.sql
ALTER TABLE matrix_rows ADD COLUMN requirement_number TEXT NOT NULL DEFAULT '';
```

**1.3 Update database.ts**
- Add `requirementNumber` to all SELECT queries
- Add to INSERT/UPDATE statements
- Map snake_case `requirement_number` to camelCase

### Phase 2: UI Changes for Entry

**2.1 Replace sequential row number with editable "Req #" column**

Remove the current `row-number` display column and replace with editable requirement number:

```typescript
columnHelper.accessor("requirementNumber", {
  header: "Req #",
  size: 80,
  cell: ({ row, getValue }) => (
    <RequirementNumberCell
      value={getValue()}
      rowId={row.original.id}
      rowIndex={row.index}
      allRows={rows}
      onUpdate={onUpdateRow}
    />
  ),
}),
```

**2.2 Auto-suggest numbering logic**

When a new row is added or user focuses empty Req # cell:
- Look at previous row's number
- Suggest incrementing the last segment: "1.2" → "1.3"
- User can override manually

**2.3 Tab/Shift+Tab for indent/outdent**

Special keyboard handling in Req # cell:
- **Tab** (when in Req # cell): Indent - converts "2" to "1.1" (becomes child of previous)
- **Shift+Tab** (when in Req # cell): Outdent - converts "1.2.1" to "1.3" (moves up a level)
- Regular Tab still moves to next column

```typescript
function indentNumber(current: string, previousNumber: string): string {
  // "2" after "1" → "1.1" (become child of previous)
  // "1.3" after "1.2" → "1.2.1" (become child of previous)
  return `${previousNumber}.1`;
}

function outdentNumber(current: string): string {
  // "1.2.1" → "1.3" (go up a level, increment)
  const parts = current.split('.');
  if (parts.length <= 1) return current; // Can't outdent top level
  parts.pop();
  parts[parts.length - 1] = String(parseInt(parts[parts.length - 1]) + 1);
  return parts.join('.');
}
```

**2.4 Validation with warnings**

Enforce numeric dot-separated format:
```typescript
function isValidRequirementNumber(value: string): boolean {
  if (!value) return true; // Empty is OK
  return /^\d+(\.\d+)*$/.test(value);
}
```

Show inline warning if format is invalid (red border, tooltip).

### Phase 3: Display Enhancements

**3.1 Visual hierarchy with indentation**

Parse the requirement number to determine depth:
```typescript
function getDepth(reqNum: string): number {
  if (!reqNum) return 0;
  return (reqNum.match(/\./g) || []).length;
}
```

Apply indentation in the Requirements cell:
```typescript
<div style={{ paddingLeft: `${getDepth(row.original.requirementNumber) * 16}px` }}>
  {requirement text}
</div>
```

**3.2 Always sort by requirement number**

Default sort is by requirement number using natural sort:
```typescript
function naturalSortRequirements(a: string, b: string): number {
  // Split by dots, compare each segment numerically
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aVal = aParts[i] ?? 0;
    const bVal = bParts[i] ?? 0;
    if (aVal !== bVal) return aVal - bVal;
  }
  return 0;
}
```

This ensures: 1 < 1.1 < 1.2 < 1.10 < 2 < 2.1

### Phase 4: Excel Import/Export

**4.1 Export**
Add "Req #" as first column in export:
```
| Req # | Requirements | Experience... | Past Perf | Comments |
| 1     | Text...      | 3             | Ref...    | Note...  |
| 1.1   | Sub text...  | 2             |           |          |
```

**4.2 Import with conflict detection**

1. Detect "Req #" or "Requirement Number" column header
2. If importing into existing matrix:
   - Compare by requirement number first
   - If number matches existing row, flag as potential conflict
   - Show dialog: "Requirement 1.2 exists. Replace / Keep existing / Keep both?"
3. If no Req # column in import file, auto-generate sequential numbers

### Phase 5: Comparison View

Update comparison logic:
- **Primary match**: By requirement number (exact match)
- **Secondary match**: By requirement text (case-insensitive, trimmed)
- If number exists in one matrix but not another, show as unique to that matrix
- Highlight mismatches where number matches but text differs

---

## UX Flow for Creating a New Matrix

### Scenario 1: Manual Entry
1. User clicks "Add Row"
2. New row appears with "Req #" pre-filled with suggested number (e.g., "1" for first row)
3. User can:
   - Accept and Tab to move to Requirements column
   - Press Tab again in Req # to indent (e.g., "1" → "0.1" or after "1.2" → "1.2.1")
   - Press Shift+Tab to outdent
   - Type custom number and Tab to continue
4. User types requirement text, presses Enter or Tab to save
5. User clicks "Add Row" again → system suggests next number (e.g., "1.3" after "1.2")

### Scenario 2: Import from Excel
1. User imports Excel file
2. If "Req #" column exists:
   - Numbers are imported and validated
   - Invalid formats show warning
   - Conflicts with existing rows prompt user resolution
3. If no Req # column:
   - Auto-generate sequential numbers (1, 2, 3...)

### Scenario 3: Bulk Entry Mode (Future Enhancement - Deferred)
Not in initial release.

---

## Migration Strategy

1. Add `requirement_number` column with empty default
2. Existing rows get empty `requirementNumber`
3. On first load, auto-assign sequential numbers to existing rows that have empty numbers
4. Users can edit numbers as needed

---

## UI Mockup (ASCII)

```
┌────────┬─────────────────────────────┬───────────────┬──────────────┬──────────┐
│ Req #  │ Requirements                │ Exp & Cap     │ Past Perf    │ Comments │
├────────┼─────────────────────────────┼───────────────┼──────────────┼──────────┤
│ 1      │ Main requirement            │ ●●●○          │ Reference... │ Note...  │
├────────┼─────────────────────────────┼───────────────┼──────────────┼──────────┤
│ 1.1    │   Sub requirement           │ ●●○○          │              │          │
├────────┼─────────────────────────────┼───────────────┼──────────────┼──────────┤
│ 1.2    │   Another sub               │ ●●●●          │ Project X    │          │
├────────┼─────────────────────────────┼───────────────┼──────────────┼──────────┤
│ 1.2.1  │     Sub-sub requirement     │ ●●○○          │              │          │
├────────┼─────────────────────────────┼───────────────┼──────────────┼──────────┤
│ 2      │ Second main requirement     │ ●●●○          │ Project Y    │ TBD      │
└────────┴─────────────────────────────┴───────────────┴──────────────┴──────────┘
```

Note: Req # column is editable. Requirements text is indented based on depth (number of dots in Req #).

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/matrix.ts` | Add `requirementNumber` field |
| `src-tauri/migrations/002_*.sql` | New migration for column |
| `src/lib/database.ts` | Update queries, add sorting |
| `src/components/matrix/MatrixTable.tsx` | Replace row-number with Req # column, add indentation |
| `src/components/matrix/RequirementNumberCell.tsx` | **NEW** - Specialized cell with Tab/Shift+Tab handling |
| `src/lib/requirementNumber.ts` | **NEW** - Validation, sorting, indent/outdent utilities |
| `src/lib/excel/exporter.ts` | Export Req # column |
| `src/lib/excel/importer.ts` | Import Req # column, conflict detection |
| `src/contexts/MatrixContext.tsx` | Handle new field in state |
| `src/hooks/useActiveMatrix.ts` | Update row handlers, sorting |

---

## Remaining Questions

None - all major decisions have been resolved. Ready for implementation.
