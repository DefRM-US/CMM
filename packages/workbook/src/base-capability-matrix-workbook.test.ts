import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import {
  type BaseCapabilityMatrixExportChoices,
  buildBaseCapabilityMatrixWorkbook,
  parseMemberResponseWorkbook,
} from './index';

type ProtectedWorksheetModel = ExcelJS.WorksheetModel & {
  sheetProtection?: {
    sheet?: boolean;
  };
};

const defaultExportChoices: BaseCapabilityMatrixExportChoices = {
  includeBlankRequirements: false,
  includeRetiredRequirements: false,
};

const workbookInput = {
  opportunity: {
    id: 'opportunity-1',
    name: 'Arctic Radar Upgrade',
    solicitationNumber: 'RFP-2026-17',
    issuingAgency: 'Naval Systems Command',
    description: null,
    createdAt: '2026-05-01T09:00:00.000Z',
    updatedAt: '2026-05-01T09:05:00.000Z',
    lastOpenedAt: null,
    archivedAt: null,
  },
  exportTimestamp: '2026-05-02T10:00:00.000Z',
  requirements: [
    {
      id: 'requirement-1',
      text: 'Provide secure hosting',
      level: 1,
      position: 0,
      retiredAt: null,
    },
    {
      id: 'requirement-2',
      text: 'Operate help desk',
      level: 2,
      position: 1,
      retiredAt: null,
    },
    {
      id: 'requirement-retired',
      text: 'Retired draft row',
      level: 1,
      position: 2,
      retiredAt: '2026-05-01T10:00:00.000Z',
    },
    {
      id: 'requirement-blank',
      text: '   ',
      level: 1,
      position: 3,
      retiredAt: null,
    },
  ],
};

const buildWorkbook = (exportChoices = defaultExportChoices) =>
  buildBaseCapabilityMatrixWorkbook({
    ...workbookInput,
    exportChoices,
  });

const loadWorkbook = async (buffer: Uint8Array): Promise<ExcelJS.Workbook> => {
  const workbook = new ExcelJS.Workbook();
  const workbookBuffer = buffer as unknown as Parameters<typeof workbook.xlsx.load>[0];
  await workbook.xlsx.load(workbookBuffer);
  return workbook;
};

describe('Base Capability Matrix workbook export', () => {
  it('builds a protected CMM-authored workbook with hidden metadata and editable response fields', async () => {
    const buffer = await buildWorkbook();
    const workbook = await loadWorkbook(buffer);

    const matrixSheet = workbook.getWorksheet('Base Capability Matrix');
    const metadataSheet = workbook.getWorksheet('CMM Metadata');
    expect(matrixSheet).toBeDefined();
    expect(metadataSheet).toBeDefined();
    if (!matrixSheet || !metadataSheet) {
      throw new Error('Expected workbook sheets to exist.');
    }
    expect(metadataSheet?.state).toBe('hidden');

    expect(metadataSheet?.getCell('A1').value).toBe('workbookFormatVersion');
    expect(metadataSheet?.getCell('B1').value).toBe('1');
    expect(metadataSheet?.getCell('A2').value).toBe('opportunityId');
    expect(metadataSheet?.getCell('B2').value).toBe('opportunity-1');
    expect(metadataSheet?.getCell('A3').value).toBe('exportTimestamp');
    expect(metadataSheet?.getCell('B3').value).toBe('2026-05-02T10:00:00.000Z');
    expect(metadataSheet?.getCell('A5').value).toBe('requirementId');
    expect(metadataSheet?.getCell('B5').value).toBe('requirementNumber');
    expect(metadataSheet?.getCell('A6').value).toBe('requirement-1');
    expect(metadataSheet?.getCell('B6').value).toBe('1');
    expect(metadataSheet?.getCell('A7').value).toBe('requirement-2');
    expect(metadataSheet?.getCell('B7').value).toBe('1.1');

    expect(matrixSheet?.getCell('A1').value).toBe('Opportunity');
    expect(matrixSheet?.getCell('B1').value).toBe('Arctic Radar Upgrade');
    expect(matrixSheet?.getCell('A2').value).toBe('Solicitation Number');
    expect(matrixSheet?.getCell('B2').value).toBe('RFP-2026-17');
    expect(matrixSheet?.getCell('A3').value).toBe('Issuing Agency');
    expect(matrixSheet?.getCell('B3').value).toBe('Naval Systems Command');
    expect(matrixSheet?.getCell('A4').value).toBe('Potential Consortium Member');
    expect(matrixSheet?.getCell('B4').protection?.locked).toBe(false);

    expect(matrixSheet?.getCell('A6').value).toBe('Capability Score');
    expect(matrixSheet?.getCell('B6').value).toContain('0');
    expect(matrixSheet?.getCell('B6').value).toContain('3');
    expect(
      (matrixSheet?.model as ProtectedWorksheetModel | undefined)?.sheetProtection?.sheet,
    ).toBe(true);

    expect(matrixSheet?.getRow(8).values).toEqual([
      undefined,
      'Requirement #',
      'Requirement',
      'Capability Score',
      'Past Performance Reference',
      'Response Comment',
      'CMM Requirement ID',
    ]);
    expect(matrixSheet?.getColumn(6).hidden).toBe(true);

    expect(matrixSheet?.getCell('A9').value).toBe('1');
    expect(matrixSheet?.getCell('B9').value).toBe('Provide secure hosting');
    expect(matrixSheet?.getCell('F9').value).toBe('requirement-1');
    expect(matrixSheet?.getCell('A10').value).toBe('1.1');
    expect(matrixSheet?.getCell('B10').value).toBe('Operate help desk');
    expect(matrixSheet?.getCell('F10').value).toBe('requirement-2');
    expect(matrixSheet?.getCell('A11').value).toBeNull();

    expect(matrixSheet?.getCell('A9').protection?.locked).not.toBe(false);
    expect(matrixSheet?.getCell('B9').protection?.locked).not.toBe(false);
    expect(matrixSheet?.getCell('F9').protection?.locked).not.toBe(false);
    expect(matrixSheet?.getCell('C9').protection?.locked).toBe(false);
    expect(matrixSheet?.getCell('D9').protection?.locked).toBe(false);
    expect(matrixSheet?.getCell('E9').protection?.locked).toBe(false);
    expect(matrixSheet?.getCell('D9').alignment?.wrapText).toBe(true);
    expect(matrixSheet?.getCell('E9').alignment?.wrapText).toBe(true);
    expect(matrixSheet?.getCell('C9').dataValidation).toMatchObject({
      type: 'list',
      allowBlank: true,
      formulae: ['"0,1,2,3"'],
    });

    matrixSheet.getCell('B4').value = 'Polar Systems LLC';
    matrixSheet.getCell('C9').value = 3;
    matrixSheet.getCell('D9').value = 'Hosted IL5 workloads\nSupported SOC operations';
    matrixSheet.getCell('E9').value = 'Prime experience\nAvailable immediately';

    const roundTripBuffer = await workbook.xlsx.writeBuffer();
    await expect(parseMemberResponseWorkbook(new Uint8Array(roundTripBuffer))).resolves.toEqual({
      metadata: {
        workbookFormatVersion: '1',
        opportunityId: 'opportunity-1',
        exportTimestamp: '2026-05-02T10:00:00.000Z',
      },
      memberName: 'Polar Systems LLC',
      rows: [
        {
          requirementId: 'requirement-1',
          requirementNumber: '1',
          requirementText: 'Provide secure hosting',
          capabilityScore: 3,
          pastPerformanceReference: 'Hosted IL5 workloads\nSupported SOC operations',
          responseComment: 'Prime experience\nAvailable immediately',
        },
        {
          requirementId: 'requirement-2',
          requirementNumber: '1.1',
          requirementText: 'Operate help desk',
          capabilityScore: null,
          pastPerformanceReference: '',
          responseComment: '',
        },
      ],
    });
  });

  it('includes blank and retired Requirements when export choices opt into them', async () => {
    const buffer = await buildWorkbook({
      includeBlankRequirements: true,
      includeRetiredRequirements: true,
    });
    const workbook = await loadWorkbook(buffer);

    const matrixSheet = workbook.getWorksheet('Base Capability Matrix');
    const metadataSheet = workbook.getWorksheet('CMM Metadata');
    expect(matrixSheet).toBeDefined();
    expect(metadataSheet).toBeDefined();
    if (!matrixSheet || !metadataSheet) {
      throw new Error('Expected workbook sheets to exist.');
    }

    expect(metadataSheet.getCell('A8').value).toBe('requirement-retired');
    expect(metadataSheet.getCell('B8').value).toBe('2');
    expect(metadataSheet.getCell('A9').value).toBe('requirement-blank');
    expect(metadataSheet.getCell('B9').value).toBe('3');

    expect(matrixSheet.getCell('A11').value).toBe('2');
    expect(matrixSheet.getCell('B11').value).toBe('Retired draft row');
    expect(matrixSheet.getCell('F11').value).toBe('requirement-retired');
    expect(matrixSheet.getCell('A12').value).toBe('3');
    expect(matrixSheet.getCell('B12').value).toBe('');
    expect(matrixSheet.getCell('F12').value).toBe('requirement-blank');
    expect(matrixSheet.getCell('A13').value).toBeNull();
  });

  it('applies blank and retired export choices independently', async () => {
    const blankOnlyWorkbook = await parseMemberResponseWorkbook(
      await buildWorkbook({
        includeBlankRequirements: true,
        includeRetiredRequirements: false,
      }),
    );
    expect(blankOnlyWorkbook.rows.map((row) => row.requirementId)).toEqual([
      'requirement-1',
      'requirement-2',
      'requirement-blank',
    ]);

    const retiredOnlyWorkbook = await parseMemberResponseWorkbook(
      await buildWorkbook({
        includeBlankRequirements: false,
        includeRetiredRequirements: true,
      }),
    );
    expect(retiredOnlyWorkbook.rows.map((row) => row.requirementId)).toEqual([
      'requirement-1',
      'requirement-2',
      'requirement-retired',
    ]);
  });
});
