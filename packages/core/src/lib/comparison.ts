import type { Score, CapabilityMatrixWithRows } from "../types/matrix";

/**
 * Cell data for a single company's response to a requirement
 */
export interface ComparisonCellData {
  score: Score;
  pastPerformance: string;
  comments: string;
  rowId: string;
}

/**
 * A single row in the comparison table
 */
export interface ComparisonRow {
  /** The requirement text (original casing from first occurrence) */
  requirement: string;
  /** Normalized requirement for matching */
  normalizedRequirement: string;
  /** Map of matrixId -> cell data */
  cells: Map<string, ComparisonCellData>;
}

/**
 * Complete comparison data structure
 */
export interface ComparisonData {
  /** Unique requirements list (order preserved by first appearance) */
  rows: ComparisonRow[];
  /** Matrices included in comparison (metadata + name for display) */
  matrices: Array<{ id: string; name: string }>;
}

/**
 * Data needed for delete requirement confirmation
 */
export interface RequirementDeleteInfo {
  requirement: string;
  companiesWithData: Array<{
    matrixId: string;
    matrixName: string;
    score: Score;
    hasComments: boolean;
    hasPastPerformance: boolean;
  }>;
}

/**
 * Normalize requirement text for matching
 * Trims whitespace and converts to lowercase for case-insensitive comparison
 */
export function normalizeRequirement(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * Build comparison data from multiple matrices
 * Requirements are matched case-insensitively after trimming
 */
export function buildComparisonData(
  matrices: CapabilityMatrixWithRows[]
): ComparisonData {
  // Map to track unique requirements and their row data
  // Key is normalized requirement text
  const requirementMap = new Map<string, ComparisonRow>();

  // Order map to preserve first-seen order
  const orderMap = new Map<string, number>();
  let order = 0;

  for (const matrix of matrices) {
    for (const row of matrix.rows) {
      const normalizedReq = normalizeRequirement(row.requirements);

      // Skip empty requirements
      if (!normalizedReq) continue;

      // Get or create comparison row
      let compRow = requirementMap.get(normalizedReq);
      if (!compRow) {
        compRow = {
          requirement: row.requirements.trim(), // Keep original casing from first occurrence
          normalizedRequirement: normalizedReq,
          cells: new Map(),
        };
        requirementMap.set(normalizedReq, compRow);
        orderMap.set(normalizedReq, order++);
      }

      // Add cell data for this matrix
      compRow.cells.set(matrix.id, {
        score: row.experienceAndCapability,
        pastPerformance: row.pastPerformance,
        comments: row.comments,
        rowId: row.id,
      });
    }
  }

  // Convert to array and sort by first-seen order
  const rows = Array.from(requirementMap.values()).sort((a, b) => {
    const orderA = orderMap.get(a.normalizedRequirement) ?? 0;
    const orderB = orderMap.get(b.normalizedRequirement) ?? 0;
    return orderA - orderB;
  });

  return {
    rows,
    matrices: matrices.map((m) => ({ id: m.id, name: m.name })),
  };
}

/**
 * Get information about which companies have data for a requirement
 * Used for delete confirmation dialog
 */
export function getRequirementDeleteInfo(
  comparisonData: ComparisonData,
  requirement: string
): RequirementDeleteInfo {
  const normalizedReq = normalizeRequirement(requirement);
  const row = comparisonData.rows.find(
    (r) => r.normalizedRequirement === normalizedReq
  );

  const companiesWithData: RequirementDeleteInfo["companiesWithData"] = [];

  if (row) {
    for (const matrix of comparisonData.matrices) {
      const cell = row.cells.get(matrix.id);
      if (cell) {
        // Only include if there's actual data (not just empty cells)
        const hasData =
          cell.score !== null ||
          cell.pastPerformance.trim() !== "" ||
          cell.comments.trim() !== "";

        if (hasData) {
          companiesWithData.push({
            matrixId: matrix.id,
            matrixName: matrix.name,
            score: cell.score,
            hasComments: cell.comments.trim() !== "",
            hasPastPerformance: cell.pastPerformance.trim() !== "",
          });
        }
      }
    }
  }

  return {
    requirement,
    companiesWithData,
  };
}

/**
 * Check if a cell has any tooltip-worthy content
 */
export function cellHasTooltipContent(
  cell: ComparisonCellData | undefined
): boolean {
  if (!cell) return false;
  return cell.pastPerformance.trim() !== "" || cell.comments.trim() !== "";
}
