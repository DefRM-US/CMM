import * as XLSX from 'xlsx';
import type { Score } from '../types/matrix';

/**
 * Parsed row from an Excel file
 */
export interface ParsedRow {
  requirementNumber: string;
  requirements: string;
  experienceAndCapability: Score;
  pastPerformance: string;
  comments: string;
}

/**
 * Parsed matrix from an Excel file
 */
export interface ParsedMatrix {
  /** Company name extracted from file or metadata */
  name: string;
  /** Original filename */
  sourceFile: string;
  /** Sheet name if from multi-sheet workbook */
  sheetName?: string;
  /** Parsed data rows */
  rows: ParsedRow[];
}

/**
 * Result of parsing an Excel file
 */
export interface ParseResult {
  matrices: ParsedMatrix[];
  errors: string[];
}

/**
 * Validate and convert a value to a Score (0-3 or null)
 */
function validateScore(value: unknown): Score {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // Handle string values
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num >= 0 && num <= 3) {
      return num as Score;
    }
    return null;
  }

  // Handle number values
  if (typeof value === 'number') {
    const rounded = Math.round(value);
    if (rounded >= 0 && rounded <= 3) {
      return rounded as Score;
    }
    return null;
  }

  return null;
}

/**
 * Get cell value as string, handling various Excel data types
 */
function getCellString(cell: XLSX.CellObject | undefined): string {
  if (!cell) return '';

  // Handle different cell value types
  if (cell.v === null || cell.v === undefined) return '';

  // Use formatted value if available, otherwise raw value
  if (cell.w !== undefined) return cell.w.toString().trim();
  return cell.v.toString().trim();
}

/**
 * Header detection result
 */
interface HeaderInfo {
  row: number;
  hasReqNumberColumn: boolean;
  reqNumberCol: number;
  requirementsCol: number;
  scoreCol: number;
  pastPerfCol: number;
  commentsCol: number;
}

/**
 * Find the header row and detect column layout
 * Searches first 30 rows for "requirement" keyword
 * Also detects if there's a "Req #" column
 */
function findHeaderInfo(sheet: XLSX.WorkSheet): HeaderInfo {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  const maxRow = Math.min(range.e.r, 29); // Check first 30 rows (0-indexed)

  for (let row = 0; row <= maxRow; row++) {
    // Check each column for header keywords
    let foundReqNumber = -1;
    let foundRequirements = -1;

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellAddress];
      const value = getCellString(cell).toLowerCase();

      // Check for "Req #" or similar
      if (
        value.includes('req #') ||
        value.includes('req#') ||
        value === 'requirement number' ||
        value === 'req number'
      ) {
        foundReqNumber = col;
      }
      // Check for "Requirements" (but not "Req #")
      else if (value.includes('requirement') && !value.includes('#')) {
        foundRequirements = col;
      }
    }

    // If we found requirements column, this is likely the header row
    if (foundRequirements >= 0) {
      const hasReqNumberColumn = foundReqNumber >= 0;

      // Determine column positions based on whether Req # column exists
      if (hasReqNumberColumn) {
        // New format: Req # | Requirements | Score | Past Perf | Comments
        return {
          row,
          hasReqNumberColumn: true,
          reqNumberCol: foundReqNumber,
          requirementsCol: foundRequirements,
          scoreCol: foundRequirements + 1,
          pastPerfCol: foundRequirements + 2,
          commentsCol: foundRequirements + 3,
        };
      } else {
        // Old format: Requirements | Score | Past Perf | Comments
        return {
          row,
          hasReqNumberColumn: false,
          reqNumberCol: -1,
          requirementsCol: foundRequirements,
          scoreCol: foundRequirements + 1,
          pastPerfCol: foundRequirements + 2,
          commentsCol: foundRequirements + 3,
        };
      }
    }
  }

  // Default to row 0, old format starting at column A
  return {
    row: 0,
    hasReqNumberColumn: false,
    reqNumberCol: -1,
    requirementsCol: 0,
    scoreCol: 1,
    pastPerfCol: 2,
    commentsCol: 3,
  };
}

/**
 * Extract company name from sheet metadata
 * Looks for "Company Name" label in first 20 rows
 */
function extractCompanyName(sheet: XLSX.WorkSheet, filename: string, sheetName?: string): string {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  const maxRow = Math.min(range.e.r, 19); // Check first 20 rows

  for (let row = 0; row <= maxRow; row++) {
    for (let col = range.s.c; col <= Math.min(range.e.c, 3); col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellAddress];
      const value = getCellString(cell).toLowerCase();

      if (value.includes('company name') || value === 'company') {
        // Look for value in the next column
        const valueAddress = XLSX.utils.encode_cell({ r: row, c: col + 1 });
        const valueCell = sheet[valueAddress];
        const companyName = getCellString(valueCell);
        if (companyName) {
          return companyName;
        }
      }
    }
  }

  // Fallback to filename (without extension)
  const baseName = filename.replace(/\.(xlsx?|xls)$/i, '');
  if (sheetName && sheetName !== 'Sheet1') {
    return `${baseName} - ${sheetName}`;
  }
  return baseName;
}

/**
 * Parse a single worksheet into a ParsedMatrix
 */
function parseWorksheet(sheet: XLSX.WorkSheet, filename: string, sheetName?: string): ParsedMatrix | null {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

  // Find header row and column layout
  const headerInfo = findHeaderInfo(sheet);

  // Extract company name
  const name = extractCompanyName(sheet, filename, sheetName);

  // Parse data rows (starting after header)
  const rows: ParsedRow[] = [];
  let autoNumber = 1; // For auto-generating numbers when not present

  for (let row = headerInfo.row + 1; row <= range.e.r; row++) {
    // Requirements column
    const reqCell = sheet[XLSX.utils.encode_cell({ r: row, c: headerInfo.requirementsCol })];
    const requirements = getCellString(reqCell);

    // Skip empty requirement rows
    if (!requirements) continue;

    // Req # column (if present)
    let requirementNumber = '';
    if (headerInfo.hasReqNumberColumn && headerInfo.reqNumberCol >= 0) {
      const reqNumCell = sheet[XLSX.utils.encode_cell({ r: row, c: headerInfo.reqNumberCol })];
      requirementNumber = getCellString(reqNumCell);
    }

    // If no requirement number, auto-generate a sequential one
    if (!requirementNumber) {
      requirementNumber = String(autoNumber++);
    }

    // Score column
    const scoreCell = sheet[XLSX.utils.encode_cell({ r: row, c: headerInfo.scoreCol })];
    const experienceAndCapability = validateScore(scoreCell?.v);

    // Past Performance column
    const ppCell = sheet[XLSX.utils.encode_cell({ r: row, c: headerInfo.pastPerfCol })];
    const pastPerformance = getCellString(ppCell);

    // Comments column
    const commentsCell = sheet[XLSX.utils.encode_cell({ r: row, c: headerInfo.commentsCol })];
    const comments = getCellString(commentsCell);

    rows.push({
      requirementNumber,
      requirements,
      experienceAndCapability,
      pastPerformance,
      comments,
    });
  }

  // Return null if no valid rows found
  if (rows.length === 0) {
    return null;
  }

  return {
    name,
    sourceFile: filename,
    sheetName,
    rows,
  };
}

/**
 * Parse an Excel file (ArrayBuffer) into ParsedMatrix objects
 * Handles multiple sheets per workbook
 */
export function parseExcelFile(data: ArrayBuffer, filename: string): ParseResult {
  const matrices: ParsedMatrix[] = [];
  const errors: string[] = [];

  try {
    const workbook = XLSX.read(data, { type: 'array' });

    for (const sheetName of workbook.SheetNames) {
      try {
        const sheet = workbook.Sheets[sheetName];
        const parsed = parseWorksheet(sheet, filename, workbook.SheetNames.length > 1 ? sheetName : undefined);

        if (parsed) {
          matrices.push(parsed);
        }
      } catch (sheetError) {
        errors.push(
          `Error parsing sheet "${sheetName}" in ${filename}: ${sheetError instanceof Error ? sheetError.message : 'Unknown error'}`
        );
      }
    }

    if (matrices.length === 0 && errors.length === 0) {
      errors.push(`No valid data found in ${filename}`);
    }
  } catch (error) {
    errors.push(`Failed to parse ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return { matrices, errors };
}

/**
 * Parse multiple Excel files
 */
export function parseExcelFiles(files: Array<{ data: ArrayBuffer; filename: string }>): ParseResult {
  const allMatrices: ParsedMatrix[] = [];
  const allErrors: string[] = [];

  for (const file of files) {
    const result = parseExcelFile(file.data, file.filename);
    allMatrices.push(...result.matrices);
    allErrors.push(...result.errors);
  }

  return {
    matrices: allMatrices,
    errors: allErrors,
  };
}

/**
 * Get filename from a file path
 */
export function getFilenameFromPath(path: string): string {
  // Handle both Windows and Unix paths
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}
