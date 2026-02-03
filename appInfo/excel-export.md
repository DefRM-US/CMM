# Excel Export (macOS)

This app exports the Capability Matrix to a local `.xlsx` file using a small,
custom writer instead of ExcelJS. ExcelJS/JSZip caused microtask recursion in
React Native macOS, so the export path now generates the minimal XLSX parts
directly and packages them with a store-only ZIP writer.

## User Flow
1. In the Capability Matrix screen, click `Export to Excel`.
2. The macOS save panel opens to pick a filename and location.
3. The file is written to the selected path.

## Key Files
- `apps/macos/src/screens/RequirementsEditorScreen.tsx`
  - Builds the export rows and invokes `generateSpreadsheet`.
  - Uses the macOS save panel module to get the output path.
- `packages/core/src/excel.ts`
  - Generates XLSX XML parts and zips them without external dependencies.
- `apps/macos/macos/MacOSApp-macOS/SavePanelModule.mm`
  - Native module that shows `NSSavePanel` and returns the chosen path.

## Current Spreadsheet Shape
- Single sheet named `Data Export`.
- Columns (in order):
  1. `Number`
  2. `Requirement`
  3. `Status`
  4. `Contractor Response`
  5. `Contractor Notes`
- Rows are written as inline strings.
- Column widths are applied; there is no additional formatting.

## Limitations
- Single worksheet only.
- No formulas or styling beyond column widths.
- All cells are stored as strings.

## Updating the Format
- Update columns or row data in
  `apps/macos/src/screens/RequirementsEditorScreen.tsx`.
- If you need more advanced XLSX features (styles, formulas, multiple sheets),
  the export writer in `packages/core/src/excel.ts` will need to be extended.
