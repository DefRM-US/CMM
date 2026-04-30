import { describe, expect, it } from 'vitest';
import { deriveImportFileDetails } from './import-filenames';

describe('deriveImportFileDetails', () => {
  it('derives the display filename and company name from a Windows workbook path', () => {
    expect(deriveImportFileDetails('C:\\dir\\Vendor A.xlsx')).toEqual({
      filename: 'Vendor A.xlsx',
      companyName: 'Vendor A',
    });
  });

  it('keeps slash-separated workbook path handling unchanged', () => {
    expect(deriveImportFileDetails('/dir/Vendor A.xlsx')).toEqual({
      filename: 'Vendor A.xlsx',
      companyName: 'Vendor A',
    });
  });

  it('keeps bare workbook filename handling unchanged', () => {
    expect(deriveImportFileDetails('Vendor A.xlsx')).toEqual({
      filename: 'Vendor A.xlsx',
      companyName: 'Vendor A',
    });
  });
});
