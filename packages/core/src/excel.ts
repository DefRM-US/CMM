import './globals'; // Must be first
import { DocumentDirectoryPath, writeFile } from '@dr.pogodin/react-native-fs';
import ExcelJS from 'exceljs';

export const generateSpreadsheet = async (
  data: Record<string, unknown>[],
  filename?: string,
): Promise<string> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data Export');

  if (data.length > 0) {
    const firstRow = data[0];
    if (firstRow) {
      const columns = Object.keys(firstRow).map((key) => ({
        header: key.charAt(0).toUpperCase() + key.slice(1),
        key,
        width: 20,
      }));
      worksheet.columns = columns;

      for (const row of data) {
        worksheet.addRow(row);
      }

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const outputFilename = filename ?? `export-${Date.now()}`;
  const filePath = `${DocumentDirectoryPath}/${outputFilename}.xlsx`;

  await writeFile(filePath, base64, 'base64');
  return filePath;
};
