import './globals'; // Must be first
import { DocumentDirectoryPath, writeFile } from '@dr.pogodin/react-native-fs';

export interface SpreadsheetColumn {
  header: string;
  key?: string;
  width?: number;
}

export interface GenerateSpreadsheetOptions {
  columns?: SpreadsheetColumn[];
  sheetName?: string;
  filename?: string;
  filePath?: string;
}

const resolveOptions = (
  filenameOrOptions?: string | GenerateSpreadsheetOptions,
): GenerateSpreadsheetOptions => {
  if (typeof filenameOrOptions === 'string') {
    return { filename: filenameOrOptions };
  }
  return filenameOrOptions ?? {};
};

export const generateSpreadsheet = async (
  data: Array<Record<string, unknown> | unknown[]>,
  filenameOrOptions?: string | GenerateSpreadsheetOptions,
): Promise<string> => {
  const options = resolveOptions(filenameOrOptions);
  const explicitColumns = options.columns?.length ? options.columns : null;
  let derivedColumns: SpreadsheetColumn[] | null = explicitColumns;

  if (!derivedColumns && data.length > 0) {
    const firstRow = data[0];
    if (firstRow && !Array.isArray(firstRow)) {
      derivedColumns = Object.keys(firstRow).map((key) => ({
        header: key.charAt(0).toUpperCase() + key.slice(1),
        key,
        width: 20,
      }));
    }
  }

  const headerRow = derivedColumns ? derivedColumns.map((column) => column.header) : [];
  const rows = data.map((row) => {
    if (Array.isArray(row)) {
      return row;
    }
    if (derivedColumns) {
      return derivedColumns.map((column) => (column.key ? row[column.key] : ''));
    }
    return Object.values(row);
  });

  const allRows = headerRow.length > 0 ? [headerRow, ...rows] : rows;
  const sheetName = options.sheetName ?? 'Data Export';
  const worksheetXml = buildWorksheetXml(allRows, derivedColumns);
  const workbookXml = buildWorkbookXml(sheetName);
  const relsXml = buildRelsXml();
  const workbookRelsXml = buildWorkbookRelsXml();
  const contentTypesXml = buildContentTypesXml();

  const zipBuffer = createZip([
    { path: '[Content_Types].xml', data: Buffer.from(contentTypesXml, 'utf8') },
    { path: '_rels/.rels', data: Buffer.from(relsXml, 'utf8') },
    { path: 'xl/workbook.xml', data: Buffer.from(workbookXml, 'utf8') },
    { path: 'xl/_rels/workbook.xml.rels', data: Buffer.from(workbookRelsXml, 'utf8') },
    { path: 'xl/worksheets/sheet1.xml', data: Buffer.from(worksheetXml, 'utf8') },
  ]);
  const base64 = zipBuffer.toString('base64');
  const outputFilename = options.filename ?? `export-${Date.now()}`;
  const filePath = options.filePath
    ? options.filePath.endsWith('.xlsx')
      ? options.filePath
      : `${options.filePath}.xlsx`
    : `${DocumentDirectoryPath}/${outputFilename}.xlsx`;

  await writeFile(filePath, base64, 'base64');
  return filePath;
};

const xmlEscape = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const columnLetter = (index: number): string => {
  let result = '';
  let current = index;
  while (current > 0) {
    const modulo = (current - 1) % 26;
    result = String.fromCharCode(65 + modulo) + result;
    current = Math.floor((current - 1) / 26);
  }
  return result;
};

const buildWorksheetXml = (rows: Array<unknown[]>, columns: SpreadsheetColumn[] | null): string => {
  const columnList = columns ?? [];
  const colsXml = columnList.some((column) => column.width !== undefined)
    ? `<cols>${columnList
        .map((column, index) => {
          const width = column.width ?? 20;
          const position = index + 1;
          return `<col min="${position}" max="${position}" width="${width}" customWidth="1"/>`;
        })
        .join('')}</cols>`
    : '';

  const rowsXml = rows
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const cellsXml = row
        .map((cell, colIndex) => {
          const value = cell === null || cell === undefined ? '' : String(cell);
          const cellRef = `${columnLetter(colIndex + 1)}${rowNumber}`;
          return `<c r="${cellRef}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
        })
        .join('');
      return `<row r="${rowNumber}">${cellsXml}</row>`;
    })
    .join('');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `${colsXml}<sheetData>${rowsXml}</sheetData></worksheet>`
  );
};

const buildWorkbookXml = (sheetName: string): string => {
  const safeName = xmlEscape(sheetName);
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets><sheet name="${safeName}" sheetId="1" r:id="rId1"/></sheets></workbook>`
  );
};

const buildRelsXml = (): string =>
  `<?xml version="1.0" encoding="UTF-8"?>` +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" ` +
  `Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" ` +
  `Target="xl/workbook.xml"/>` +
  `</Relationships>`;

const buildWorkbookRelsXml = (): string =>
  `<?xml version="1.0" encoding="UTF-8"?>` +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" ` +
  `Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" ` +
  `Target="worksheets/sheet1.xml"/>` +
  `</Relationships>`;

const buildContentTypesXml = (): string =>
  `<?xml version="1.0" encoding="UTF-8"?>` +
  `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
  `<Default Extension="rels" ` +
  `ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
  `<Default Extension="xml" ContentType="application/xml"/>` +
  `<Override PartName="/xl/workbook.xml" ` +
  `ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
  `<Override PartName="/xl/worksheets/sheet1.xml" ` +
  `ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
  `</Types>`;

type ZipEntry = {
  path: string;
  data: Buffer;
};

const createZip = (entries: ZipEntry[]): Buffer => {
  const fileRecords: Array<{
    path: string;
    data: Buffer;
    crc32: number;
    offset: number;
  }> = [];

  let offset = 0;
  const localParts: Buffer[] = [];

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.path, 'utf8');
    const dataBuffer = entry.data;
    const crc32 = calculateCrc32(dataBuffer);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc32, 14);
    localHeader.writeUInt32LE(dataBuffer.length, 18);
    localHeader.writeUInt32LE(dataBuffer.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuffer, dataBuffer);

    fileRecords.push({
      path: entry.path,
      data: dataBuffer,
      crc32,
      offset,
    });

    offset += localHeader.length + nameBuffer.length + dataBuffer.length;
  }

  const centralParts: Buffer[] = [];
  let centralSize = 0;
  const centralOffset = offset;

  for (const record of fileRecords) {
    const nameBuffer = Buffer.from(record.path, 'utf8');
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(record.crc32, 16);
    centralHeader.writeUInt32LE(record.data.length, 20);
    centralHeader.writeUInt32LE(record.data.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(record.offset, 42);

    centralParts.push(centralHeader, nameBuffer);
    centralSize += centralHeader.length + nameBuffer.length;
  }

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, eocd]);
};

const buildCrcTable = (): Uint32Array => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let j = 0; j < 8; j += 1) {
      value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[i] = value >>> 0;
  }
  return table;
};

const CRC_TABLE = buildCrcTable();

const calculateCrc32 = (buffer: Buffer): number => {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};
