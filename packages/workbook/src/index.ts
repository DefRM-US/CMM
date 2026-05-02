import {
  computeRequirementNumbers,
  type IsoDateTime,
  type Opportunity,
  type Requirement,
} from '@cmm/domain';
import ExcelJS from 'exceljs';

const workbookFormatVersion = '1';
const matrixSheetName = 'Base Capability Matrix';
const metadataSheetName = 'CMM Metadata';
const responseStartRow = 9;

export type BaseCapabilityMatrixWorkbookRequirement = Requirement;

export type BaseCapabilityMatrixExportChoices = {
  includeBlankRequirements?: boolean;
  includeRetiredRequirements?: boolean;
};

export type BuildBaseCapabilityMatrixWorkbookInput = {
  opportunity: Opportunity;
  exportTimestamp: IsoDateTime;
  requirements: BaseCapabilityMatrixWorkbookRequirement[];
  exportChoices?: BaseCapabilityMatrixExportChoices;
};

export type ParsedMemberResponseWorkbook = {
  metadata: {
    workbookFormatVersion: string;
    opportunityId: string;
    exportTimestamp: IsoDateTime;
  };
  memberName: string;
  rows: {
    requirementId: string;
    requirementNumber: string;
    requirementText: string;
    capabilityScore: 0 | 1 | 2 | 3 | null;
    pastPerformanceReference: string;
    responseComment: string;
  }[];
};

export const buildBaseCapabilityMatrixWorkbook = (
  input: BuildBaseCapabilityMatrixWorkbookInput,
): Promise<Uint8Array> => buildWorkbook(input);

const buildWorkbook = async (
  input: BuildBaseCapabilityMatrixWorkbookInput,
): Promise<Uint8Array> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CMM';
  workbook.created = new Date(input.exportTimestamp);
  workbook.modified = new Date(input.exportTimestamp);

  const matrixSheet = workbook.addWorksheet(matrixSheetName, {
    views: [{ state: 'frozen', xSplit: 2, ySplit: 8 }],
  });
  const metadataSheet = workbook.addWorksheet(metadataSheetName);
  metadataSheet.state = 'hidden';

  writeMetadataSheet(metadataSheet, input);
  await writeMatrixSheet(matrixSheet, input);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
};

export const parseMemberResponseWorkbook = async (
  buffer: Uint8Array,
): Promise<ParsedMemberResponseWorkbook> => {
  const workbook = new ExcelJS.Workbook();
  const workbookBuffer = buffer as unknown as Parameters<typeof workbook.xlsx.load>[0];
  await workbook.xlsx.load(workbookBuffer);

  const matrixSheet = workbook.getWorksheet(matrixSheetName);
  const metadataSheet = workbook.getWorksheet(metadataSheetName);
  if (!matrixSheet || !metadataSheet) {
    throw new Error('CMM workbook sheets are missing.');
  }

  const rows: ParsedMemberResponseWorkbook['rows'] = [];
  for (let rowNumber = responseStartRow; rowNumber <= matrixSheet.rowCount; rowNumber += 1) {
    const row = matrixSheet.getRow(rowNumber);
    const requirementId = cellValueToText(row.getCell(6).value);
    const requirementNumber = cellValueToText(row.getCell(1).value);
    const requirementText = cellValueToText(row.getCell(2).value);
    if (!requirementId && !requirementNumber && !requirementText) {
      continue;
    }

    rows.push({
      requirementId,
      requirementNumber,
      requirementText,
      capabilityScore: parseCapabilityScore(row.getCell(3).value),
      pastPerformanceReference: cellValueToText(row.getCell(4).value),
      responseComment: cellValueToText(row.getCell(5).value),
    });
  }

  return {
    metadata: {
      workbookFormatVersion: cellValueToText(metadataSheet.getCell('B1').value),
      opportunityId: cellValueToText(metadataSheet.getCell('B2').value),
      exportTimestamp: cellValueToText(metadataSheet.getCell('B3').value),
    },
    memberName: cellValueToText(matrixSheet.getCell('B4').value),
    rows,
  };
};

const writeMetadataSheet = (
  sheet: ExcelJS.Worksheet,
  input: BuildBaseCapabilityMatrixWorkbookInput,
): void => {
  sheet.getCell('A1').value = 'workbookFormatVersion';
  sheet.getCell('B1').value = workbookFormatVersion;
  sheet.getCell('A2').value = 'opportunityId';
  sheet.getCell('B2').value = input.opportunity.id;
  sheet.getCell('A3').value = 'exportTimestamp';
  sheet.getCell('B3').value = input.exportTimestamp;

  const exportedRequirements = getExportedRequirements(input.requirements, input.exportChoices);
  sheet.getCell('A5').value = 'requirementId';
  sheet.getCell('B5').value = 'requirementNumber';
  exportedRequirements.forEach(({ requirement, displayNumber }, index) => {
    const row = sheet.getRow(6 + index);
    row.getCell(1).value = requirement.id;
    row.getCell(2).value = displayNumber;
  });
};

const writeMatrixSheet = (
  sheet: ExcelJS.Worksheet,
  input: BuildBaseCapabilityMatrixWorkbookInput,
): Promise<void> => {
  sheet.columns = [
    { key: 'requirementNumber', width: 18 },
    { key: 'requirementText', width: 48 },
    { key: 'capabilityScore', width: 18 },
    { key: 'pastPerformanceReference', width: 34 },
    { key: 'responseComment', width: 34 },
    { key: 'requirementId', width: 1, hidden: true },
  ];

  sheet.getCell('A1').value = 'Opportunity';
  sheet.getCell('B1').value = input.opportunity.name;
  sheet.getCell('A2').value = 'Solicitation Number';
  sheet.getCell('B2').value = input.opportunity.solicitationNumber ?? '';
  sheet.getCell('A3').value = 'Issuing Agency';
  sheet.getCell('B3').value = input.opportunity.issuingAgency ?? '';
  sheet.getCell('A4').value = 'Potential Consortium Member';
  sheet.getCell('B4').value = '';
  unlockCell(sheet.getCell('B4'));

  sheet.getCell('A6').value = 'Capability Score';
  sheet.getCell('B6').value = '0 = no capability, 1 = limited, 2 = partial, 3 = strong';

  const header = sheet.getRow(8);
  header.getCell(1).value = 'Requirement #';
  header.getCell(2).value = 'Requirement';
  header.getCell(3).value = 'Capability Score';
  header.getCell(4).value = 'Past Performance Reference';
  header.getCell(5).value = 'Response Comment';
  header.getCell(6).value = 'CMM Requirement ID';
  header.font = { bold: true };

  const exportedRequirements = getExportedRequirements(input.requirements, input.exportChoices);
  exportedRequirements.forEach(({ requirement, displayNumber }, index) => {
    const row = sheet.getRow(responseStartRow + index);
    row.getCell(1).value = displayNumber;
    row.getCell(2).value = requirement.text.trim();
    row.getCell(3).value = null;
    row.getCell(4).value = '';
    row.getCell(5).value = '';
    row.getCell(6).value = requirement.id;

    unlockCell(row.getCell(3));
    unlockCell(row.getCell(4));
    unlockCell(row.getCell(5));
    row.getCell(3).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"0,1,2,3"'],
      showErrorMessage: true,
      errorTitle: 'Invalid Capability Score',
      error: 'Use 0, 1, 2, or 3.',
    };
    row.getCell(4).alignment = { wrapText: true, vertical: 'top' };
    row.getCell(5).alignment = { wrapText: true, vertical: 'top' };
  });

  return sheet.protect('', {
    selectLockedCells: true,
    selectUnlockedCells: true,
  });
};

const getExportedRequirements = (
  requirements: Requirement[],
  exportChoices: BaseCapabilityMatrixExportChoices = {},
) =>
  computeRequirementNumbers(
    requirements.filter((requirement) => {
      const isBlank = requirement.text.trim().length === 0;
      const isRetired = requirement.retiredAt !== null;
      return (
        (!isBlank || exportChoices.includeBlankRequirements === true) &&
        (!isRetired || exportChoices.includeRetiredRequirements === true)
      );
    }),
    {
      includeRetired: exportChoices.includeRetiredRequirements === true,
    },
  );

const unlockCell = (cell: ExcelJS.Cell): void => {
  cell.protection = { locked: false };
};

const cellValueToText = (value: ExcelJS.CellValue): string => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if ('richText' in value) {
    return value.richText.map((part) => part.text).join('');
  }

  if ('text' in value) {
    return value.text;
  }

  if ('result' in value) {
    return cellValueToText(value.result);
  }

  return '';
};

const parseCapabilityScore = (value: ExcelJS.CellValue): 0 | 1 | 2 | 3 | null => {
  const text = cellValueToText(value).trim();
  if (text !== '0' && text !== '1' && text !== '2' && text !== '3') {
    return null;
  }
  return Number(text) as 0 | 1 | 2 | 3;
};
