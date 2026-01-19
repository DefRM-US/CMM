import ExcelJS from "exceljs";
import {
  SCORE_CONFIG,
  type CapabilityMatrixWithRows,
  type Score,
} from "../../types/matrix";
import { compareRequirementNumbers } from "../requirementNumber";

/**
 * Export metadata for the Excel file
 */
export interface ExportMetadata {
  companyName: string;
  date: string;
  version: string;
}

/**
 * Get ARGB color from hex (ExcelJS requires ARGB format)
 */
function hexToArgb(hex: string): string {
  // Remove # if present and add FF for alpha
  const cleanHex = hex.replace("#", "");
  return `FF${cleanHex}`;
}

/**
 * Apply cell fill style based on score
 */
function getScoreFill(score: Score): ExcelJS.Fill | undefined {
  if (score === null) return undefined;

  const config = SCORE_CONFIG[score];
  return {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: hexToArgb(config.color) },
  };
}

/**
 * Get font color for score cell
 */
function getScoreFont(score: Score): Partial<ExcelJS.Font> {
  if (score === null) {
    return { color: { argb: "FF666666" } };
  }

  const config = SCORE_CONFIG[score];
  // Use white text for blue and green (scores 2, 3), black for yellow and gray (scores 0, 1)
  const isLightText = config.textClass === "text-white";
  return {
    color: { argb: isLightText ? "FFFFFFFF" : "FF000000" },
    bold: true,
  };
}

/**
 * Export a capability matrix to an Excel workbook
 */
export async function exportMatrixToExcel(
  matrix: CapabilityMatrixWithRows,
  metadata: ExportMetadata
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Capability Matrix Management";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Capability Matrix");

  // Set column widths (Req # is first column)
  worksheet.columns = [
    { key: "requirementNumber", width: 12 },
    { key: "requirements", width: 50 },
    { key: "experienceAndCapability", width: 25 },
    { key: "pastPerformance", width: 30 },
    { key: "comments", width: 80 },
  ];

  // Row 1: Title + Legend header
  const titleRow = worksheet.getRow(1);
  titleRow.getCell(1).value = "Draft PWS - Capability Matrix";
  titleRow.getCell(1).font = { bold: true, size: 14 };

  // Legend in columns D and E (rows 1-4) - shifted by one due to new Req # column
  const legendScores: Array<Exclude<Score, null>> = [3, 2, 1, 0];
  for (let i = 0; i < legendScores.length; i++) {
    const score = legendScores[i];
    const config = SCORE_CONFIG[score];
    const row = worksheet.getRow(i + 1);

    // Score value in column D
    const scoreCell = row.getCell(4);
    scoreCell.value = score;
    scoreCell.fill = getScoreFill(score) as ExcelJS.Fill;
    scoreCell.font = getScoreFont(score);
    scoreCell.alignment = { horizontal: "center", vertical: "middle" };
    scoreCell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };

    // Description in column E
    const descCell = row.getCell(5);
    descCell.value = config.description;
    descCell.alignment = { wrapText: true, vertical: "top" };
  }

  // Row 5: Company Name (spans columns A-B)
  const companyRow = worksheet.getRow(5);
  companyRow.getCell(1).value = "Company Name";
  companyRow.getCell(1).font = { bold: true };
  companyRow.getCell(3).value = metadata.companyName;

  // Row 6: Date
  const dateRow = worksheet.getRow(6);
  dateRow.getCell(1).value = "Date";
  dateRow.getCell(1).font = { bold: true };
  dateRow.getCell(3).value = metadata.date;

  // Row 7: Version
  const versionRow = worksheet.getRow(7);
  versionRow.getCell(1).value = "Version";
  versionRow.getCell(1).font = { bold: true };
  versionRow.getCell(3).value = metadata.version;

  // Row 8: Empty (spacer)
  // Already empty by default

  // Row 9: Headers (with Req # as first column)
  const headerRow = worksheet.getRow(9);
  headerRow.values = [
    "Req #",
    "Requirements",
    "Experience and Capability",
    "Past Performance",
    "Comments",
  ];
  headerRow.font = { bold: true };
  headerRow.eachCell((cell, colNumber) => {
    if (colNumber <= 5) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD9D9D9" },
      };
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    }
  });

  // Row 10+: Data rows - sorted by requirement number
  const sortedRows = [...matrix.rows].sort((a, b) =>
    compareRequirementNumbers(a.requirementNumber, b.requirementNumber)
  );

  for (let i = 0; i < sortedRows.length; i++) {
    const matrixRow = sortedRows[i];
    const excelRow = worksheet.getRow(10 + i);

    // Req # column
    excelRow.getCell(1).value = matrixRow.requirementNumber;
    excelRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };

    // Requirements column
    excelRow.getCell(2).value = matrixRow.requirements;
    excelRow.getCell(2).alignment = { wrapText: true, vertical: "top" };

    // Experience and Capability column (with styling)
    const scoreCell = excelRow.getCell(3);
    scoreCell.value =
      matrixRow.experienceAndCapability !== null
        ? matrixRow.experienceAndCapability
        : "";
    if (matrixRow.experienceAndCapability !== null) {
      scoreCell.fill = getScoreFill(
        matrixRow.experienceAndCapability
      ) as ExcelJS.Fill;
      scoreCell.font = getScoreFont(matrixRow.experienceAndCapability);
    }
    scoreCell.alignment = { horizontal: "center", vertical: "middle" };

    // Past Performance column
    excelRow.getCell(4).value = matrixRow.pastPerformance;
    excelRow.getCell(4).alignment = { wrapText: true, vertical: "top" };

    // Comments column
    excelRow.getCell(5).value = matrixRow.comments;
    excelRow.getCell(5).alignment = { wrapText: true, vertical: "top" };

    // Add borders to all cells
    excelRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber <= 5) {
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      }
    });
  }

  // Add conditional formatting for the score column (now column C)
  // This allows the formatting to persist when users edit values in Excel
  const lastDataRow = 10 + sortedRows.length - 1;
  if (sortedRows.length > 0) {
    worksheet.addConditionalFormatting({
      ref: `C10:C${lastDataRow}`,
      rules: [
        {
          type: "cellIs",
          operator: "equal",
          formulae: ["3"],
          style: {
            fill: {
              type: "pattern",
              pattern: "solid",
              bgColor: { argb: hexToArgb(SCORE_CONFIG[3].color) },
            },
            font: { color: { argb: "FFFFFFFF" }, bold: true },
          },
          priority: 1,
        },
        {
          type: "cellIs",
          operator: "equal",
          formulae: ["2"],
          style: {
            fill: {
              type: "pattern",
              pattern: "solid",
              bgColor: { argb: hexToArgb(SCORE_CONFIG[2].color) },
            },
            font: { color: { argb: "FFFFFFFF" }, bold: true },
          },
          priority: 2,
        },
        {
          type: "cellIs",
          operator: "equal",
          formulae: ["1"],
          style: {
            fill: {
              type: "pattern",
              pattern: "solid",
              bgColor: { argb: hexToArgb(SCORE_CONFIG[1].color) },
            },
            font: { color: { argb: "FF000000" }, bold: true },
          },
          priority: 3,
        },
        {
          type: "cellIs",
          operator: "equal",
          formulae: ["0"],
          style: {
            fill: {
              type: "pattern",
              pattern: "solid",
              bgColor: { argb: hexToArgb(SCORE_CONFIG[0].color) },
            },
            font: { color: { argb: "FF000000" }, bold: true },
          },
          priority: 4,
        },
      ],
    });
  }

  return workbook;
}

/**
 * Export workbook to buffer (for saving to file)
 */
export async function workbookToBuffer(
  workbook: ExcelJS.Workbook
): Promise<Buffer> {
  return (await workbook.xlsx.writeBuffer()) as Buffer;
}

/**
 * Generate filename for export
 */
export function generateExportFilename(
  companyName: string,
  date: string
): string {
  // Sanitize company name for filename
  const sanitizedName = companyName.replace(/[^a-zA-Z0-9\s-]/g, "").trim();
  return `Capability_Matrix_${sanitizedName.replace(/\s+/g, "_")}_${date}.xlsx`;
}
