import ExcelJS from 'exceljs';
import JSZip from 'jszip';

import { buildCapabilityMatrixXlsxBuffer } from '../excel';

const buildSampleBuffer = () =>
  buildCapabilityMatrixXlsxBuffer({
    title: 'Sample Capability Matrix',
    legend: {
      3: 'Excellent capability',
      2: 'Good capability',
      1: 'Some capability',
      0: 'No capability',
    },
    rows: [
      { number: '1', text: 'Requirement one', score: 0 },
      { number: '1.1', text: 'Requirement two', score: 0 },
    ],
  });

describe('Capability matrix export', () => {
  it('produces a readable workbook', async () => {
    const buffer = buildSampleBuffer();
    const workbook = new ExcelJS.Workbook();
    const workbookBuffer = buffer as unknown as Parameters<typeof workbook.xlsx.load>[0];
    await workbook.xlsx.load(workbookBuffer);

    const sheet = workbook.getWorksheet(1);
    expect(sheet?.name).toBe('Capability Matrix');
    expect(sheet?.getCell('A1').value).toBe('Sample Capability Matrix');
    expect(sheet?.getCell('C7').value).toBe(0);
  });

  it('includes expected XML features', async () => {
    const buffer = buildSampleBuffer();
    const zip = await JSZip.loadAsync(buffer);
    const sheetXml = await zip.file('xl/worksheets/sheet1.xml')?.async('string');
    const stylesXml = await zip.file('xl/styles.xml')?.async('string');

    expect(sheetXml).toContain('pane xSplit="2" ySplit="6"');
    expect(sheetXml).toContain('mergeCell ref="A1:B1"');
    expect(sheetXml).toContain('conditionalFormatting sqref="C7:C8"');
    expect(sheetXml).toContain('<dataValidation type="list"');
    expect(sheetXml).toContain('sqref="C7:C8"');
    expect(stylesXml).toContain('cellXfs count="11"');
    expect(stylesXml).toContain('dxfs count="3"');
    expect(stylesXml).toContain('FF0070C0');
    expect(stylesXml).toContain('FF00B050');
    expect(stylesXml).toContain('FFFFFF00');
  });
});
