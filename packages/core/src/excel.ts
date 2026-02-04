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

export type CapabilityMatrixLegend = {
  3: string;
  2: string;
  1: string;
  0: string;
};

export interface CapabilityMatrixRow {
  number: string;
  text: string;
  score: 0 | 1 | 2 | 3;
  pastPerformance?: string;
  comments?: string;
}

export interface CapabilityMatrixExportOptions {
  title: string;
  legend: CapabilityMatrixLegend;
  rows: CapabilityMatrixRow[];
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

export const generateCapabilityMatrixSpreadsheet = async (
  options: CapabilityMatrixExportOptions,
): Promise<string> => {
  const zipBuffer = buildCapabilityMatrixXlsxBuffer(options);
  const base64 = zipBuffer.toString('base64');
  const outputFilename = options.filename ?? `capability-matrix-${Date.now()}`;
  const filePath = options.filePath
    ? options.filePath.endsWith('.xlsx')
      ? options.filePath
      : `${options.filePath}.xlsx`
    : `${DocumentDirectoryPath}/${outputFilename}.xlsx`;

  await writeFile(filePath, base64, 'base64');
  return filePath;
};

export const buildCapabilityMatrixXlsxBuffer = (options: CapabilityMatrixExportOptions): Buffer => {
  const sheetName = options.sheetName ?? 'Capability Matrix';
  const worksheetXml = buildCapabilityWorksheetXml(options);
  const workbookXml = buildWorkbookXml(sheetName);
  const relsXml = buildRelsXml();
  const workbookRelsXml = buildWorkbookRelsXmlWithStyles();
  const contentTypesXml = buildCapabilityContentTypesXml();
  const stylesXml = buildStylesXml();

  return createZip([
    { path: '[Content_Types].xml', data: Buffer.from(contentTypesXml, 'utf8') },
    { path: '_rels/.rels', data: Buffer.from(relsXml, 'utf8') },
    { path: 'xl/workbook.xml', data: Buffer.from(workbookXml, 'utf8') },
    { path: 'xl/_rels/workbook.xml.rels', data: Buffer.from(workbookRelsXml, 'utf8') },
    { path: 'xl/styles.xml', data: Buffer.from(stylesXml, 'utf8') },
    { path: 'xl/worksheets/sheet1.xml', data: Buffer.from(worksheetXml, 'utf8') },
  ]);
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

const buildWorkbookRelsXmlWithStyles = (): string =>
  `<?xml version="1.0" encoding="UTF-8"?>` +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" ` +
  `Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" ` +
  `Target="worksheets/sheet1.xml"/>` +
  `<Relationship Id="rId2" ` +
  `Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" ` +
  `Target="styles.xml"/>` +
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

const buildCapabilityContentTypesXml = (): string =>
  `<?xml version="1.0" encoding="UTF-8"?>` +
  `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
  `<Default Extension="rels" ` +
  `ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
  `<Default Extension="xml" ContentType="application/xml"/>` +
  `<Override PartName="/xl/workbook.xml" ` +
  `ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
  `<Override PartName="/xl/worksheets/sheet1.xml" ` +
  `ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
  `<Override PartName="/xl/styles.xml" ` +
  `ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
  `</Types>`;

const CAPABILITY_COLORS = {
  blue: 'FF0070C0',
  green: 'FF00B050',
  yellow: 'FFFFFF00',
};

const buildStylesXml = (): string => {
  const numFmts = `<numFmts count="0"/>`;

  const fonts =
    `<fonts count="8">` +
    `<font><sz val="11"/><name val="Calibri"/></font>` +
    `<font><sz val="18"/><name val="Times New Roman"/></font>` +
    `<font><b/><sz val="12"/><name val="Times New Roman"/></font>` +
    `<font><b/><sz val="11"/><name val="Times New Roman"/></font>` +
    `<font><sz val="11"/><name val="Times New Roman"/></font>` +
    `<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Times New Roman"/></font>` +
    `<font><b/><sz val="10"/><color rgb="FF000000"/><name val="Times New Roman"/></font>` +
    `<font><sz val="9"/><name val="Calibri"/></font>` +
    `</fonts>`;

  const fills =
    `<fills count="5">` +
    `<fill><patternFill patternType="none"/></fill>` +
    `<fill><patternFill patternType="gray125"/></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="${CAPABILITY_COLORS.blue}"/><bgColor rgb="${CAPABILITY_COLORS.blue}"/></patternFill></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="${CAPABILITY_COLORS.green}"/><bgColor rgb="${CAPABILITY_COLORS.green}"/></patternFill></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="${CAPABILITY_COLORS.yellow}"/><bgColor rgb="${CAPABILITY_COLORS.yellow}"/></patternFill></fill>` +
    `</fills>`;

  const borders =
    `<borders count="1">` +
    `<border><left/><right/><top/><bottom/><diagonal/></border>` +
    `</borders>`;

  const cellStyleXfs =
    `<cellStyleXfs count="1">` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>` +
    `</cellStyleXfs>`;

  const cellXfs =
    `<cellXfs count="11">` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
    `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">` +
    `<alignment horizontal="center" vertical="top" wrapText="1"/>` +
    `</xf>` +
    `<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">` +
    `<alignment horizontal="center" vertical="top" wrapText="1"/>` +
    `</xf>` +
    `<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">` +
    `<alignment horizontal="left" vertical="top" wrapText="1"/>` +
    `</xf>` +
    `<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">` +
    `<alignment horizontal="left" vertical="top" wrapText="1"/>` +
    `</xf>` +
    `<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">` +
    `<alignment horizontal="center" vertical="center"/>` +
    `</xf>` +
    `<xf numFmtId="0" fontId="5" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1">` +
    `<alignment horizontal="center" vertical="center"/>` +
    `</xf>` +
    `<xf numFmtId="0" fontId="5" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1">` +
    `<alignment horizontal="center" vertical="center"/>` +
    `</xf>` +
    `<xf numFmtId="0" fontId="6" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1">` +
    `<alignment horizontal="center" vertical="center"/>` +
    `</xf>` +
    `<xf numFmtId="0" fontId="6" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">` +
    `<alignment horizontal="center" vertical="center"/>` +
    `</xf>` +
    `<xf numFmtId="0" fontId="7" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">` +
    `<alignment horizontal="left" vertical="top" wrapText="1"/>` +
    `</xf>` +
    `</cellXfs>`;

  const cellStyles =
    `<cellStyles count="1">` +
    `<cellStyle name="Normal" xfId="0" builtinId="0"/>` +
    `</cellStyles>`;

  const dxfs =
    `<dxfs count="3">` +
    `<dxf>` +
    `<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Times New Roman"/></font>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="${CAPABILITY_COLORS.blue}"/><bgColor rgb="${CAPABILITY_COLORS.blue}"/></patternFill></fill>` +
    `</dxf>` +
    `<dxf>` +
    `<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Times New Roman"/></font>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="${CAPABILITY_COLORS.green}"/><bgColor rgb="${CAPABILITY_COLORS.green}"/></patternFill></fill>` +
    `</dxf>` +
    `<dxf>` +
    `<font><b/><sz val="11"/><color rgb="FF000000"/><name val="Times New Roman"/></font>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="${CAPABILITY_COLORS.yellow}"/><bgColor rgb="${CAPABILITY_COLORS.yellow}"/></patternFill></fill>` +
    `</dxf>` +
    `</dxfs>`;

  const tableStyles = `<tableStyles count="0" defaultTableStyle="TableStyleMedium9" defaultPivotStyle="PivotStyleLight16"/>`;

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    numFmts +
    fonts +
    fills +
    borders +
    cellStyleXfs +
    cellXfs +
    cellStyles +
    dxfs +
    tableStyles +
    `</styleSheet>`
  );
};

const buildCapabilityWorksheetXml = (options: CapabilityMatrixExportOptions): string => {
  const { title, legend, rows } = options;
  const lastRow = Math.max(6, rows.length + 6);
  const dimension = `A1:E${lastRow}`;
  const colsXml =
    `<cols>` +
    `<col min="1" max="1" width="12" customWidth="1"/>` +
    `<col min="2" max="2" width="79" customWidth="1"/>` +
    `<col min="3" max="3" width="36" customWidth="1"/>` +
    `<col min="4" max="4" width="36" customWidth="1"/>` +
    `<col min="5" max="5" width="13" customWidth="1"/>` +
    `</cols>`;

  const sheetViews =
    `<sheetViews>` +
    `<sheetView workbookViewId="0">` +
    `<pane xSplit="2" ySplit="6" topLeftCell="C7" activePane="bottomRight" state="frozen"/>` +
    `</sheetView>` +
    `</sheetViews>`;

  const sheetFormat = `<sheetFormatPr defaultRowHeight="15"/>`;

  const cellInlineStr = (ref: string, style: number, value: string): string =>
    `<c r="${ref}" s="${style}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;

  const cellNumber = (ref: string, style: number, value: number): string =>
    `<c r="${ref}" s="${style}"><v>${value}</v></c>`;

  const rowXml = (rowNumber: number, cells: string[], height?: number): string => {
    const heightAttr = height ? ` ht="${height}" customHeight="1"` : '';
    return `<row r="${rowNumber}"${heightAttr}>${cells.join('')}</row>`;
  };

  const STYLE = {
    title: 1,
    header: 2,
    section: 3,
    detail: 4,
    score: 5,
    legendScoreBlue: 6,
    legendScoreGreen: 7,
    legendScoreYellow: 8,
    legendScoreZero: 9,
    legendDesc: 10,
  } as const;

  const rowsXmlParts: string[] = [];

  rowsXmlParts.push(
    rowXml(
      1,
      [
        cellInlineStr('A1', STYLE.title, title),
        cellNumber('C1', STYLE.legendScoreBlue, 3),
        cellInlineStr('D1', STYLE.legendDesc, legend[3] ?? ''),
      ],
      37,
    ),
  );

  rowsXmlParts.push(
    rowXml(2, [
      cellNumber('C2', STYLE.legendScoreGreen, 2),
      cellInlineStr('D2', STYLE.legendDesc, legend[2] ?? ''),
    ]),
  );

  rowsXmlParts.push(
    rowXml(3, [
      cellNumber('C3', STYLE.legendScoreYellow, 1),
      cellInlineStr('D3', STYLE.legendDesc, legend[1] ?? ''),
    ]),
  );

  rowsXmlParts.push(
    rowXml(4, [
      cellNumber('C4', STYLE.legendScoreZero, 0),
      cellInlineStr('D4', STYLE.legendDesc, legend[0] ?? ''),
    ]),
  );

  rowsXmlParts.push(
    rowXml(6, [
      cellInlineStr('C6', STYLE.header, 'Experience/capability'),
      cellInlineStr('D6', STYLE.header, 'Past Performance reference'),
      cellInlineStr('E6', STYLE.header, 'Comments'),
    ]),
  );

  rows.forEach((row, index) => {
    const rowNumber = 7 + index;
    const cells = [
      cellInlineStr(`A${rowNumber}`, STYLE.section, row.number),
      cellInlineStr(`B${rowNumber}`, STYLE.section, row.text),
      cellNumber(`C${rowNumber}`, STYLE.score, row.score),
    ];
    if (row.pastPerformance) {
      cells.push(cellInlineStr(`D${rowNumber}`, STYLE.detail, row.pastPerformance));
    }
    if (row.comments) {
      cells.push(cellInlineStr(`E${rowNumber}`, STYLE.detail, row.comments));
    }
    rowsXmlParts.push(rowXml(rowNumber, cells));
  });

  const sheetDataXml = `<sheetData>${rowsXmlParts.join('')}</sheetData>`;
  const mergeCellsXml = `<mergeCells count="1"><mergeCell ref="A1:B1"/></mergeCells>`;

  const conditionalFormattingXml =
    rows.length > 0
      ? `<conditionalFormatting sqref="C7:C${lastRow}">` +
        `<cfRule type="cellIs" dxfId="0" priority="1" operator="equal"><formula>3</formula></cfRule>` +
        `<cfRule type="cellIs" dxfId="1" priority="2" operator="equal"><formula>2</formula></cfRule>` +
        `<cfRule type="cellIs" dxfId="2" priority="3" operator="equal"><formula>1</formula></cfRule>` +
        `</conditionalFormatting>`
      : '';

  const dataValidationsXml =
    rows.length > 0
      ? `<dataValidations count="1">` +
        `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" ` +
        `sqref="C7:C${lastRow}">` +
        `<formula1>"0,1,2,3"</formula1>` +
        `</dataValidation>` +
        `</dataValidations>`
      : '';

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<dimension ref="${dimension}"/>` +
    sheetViews +
    sheetFormat +
    colsXml +
    sheetDataXml +
    mergeCellsXml +
    conditionalFormattingXml +
    dataValidationsXml +
    `</worksheet>`
  );
};

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
