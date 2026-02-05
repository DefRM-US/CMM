import { getDatabase } from './database';

export interface CapabilityImportRecord {
  id: string;
  projectId: string;
  companyName: string;
  sourceFilename: string | null;
  importedAt: string;
  archivedAt: string | null;
}

export interface CapabilityImportRowRecord {
  id: string;
  importId: string;
  requirementId: string | null;
  requirementNumber: string;
  requirementText: string;
  score: number | null;
  pastPerformance: string | null;
  comments: string | null;
}

export interface CapabilityImportRowInput {
  requirementId: string | null;
  requirementNumber: string;
  requirementText: string;
  score: number | null;
  pastPerformance?: string | null;
  comments?: string | null;
}

export interface SaveCapabilityImportInput {
  projectId: string;
  companyName: string;
  sourceFilename?: string | null;
  rows: CapabilityImportRowInput[];
}

type SqlResultSet = {
  rows: {
    length: number;
    item: (index: number) => unknown;
  };
};

type CapabilityImportRow = {
  id: string;
  project_id: string;
  company_name: string;
  source_filename: string | null;
  imported_at: string;
  archived_at: string | null;
};

type CapabilityImportRowRow = {
  id: string;
  import_id: string;
  requirement_id: string | null;
  requirement_number: string;
  requirement_text: string;
  score: number | null;
  past_performance: string | null;
  comments: string | null;
};

const mapRows = <T>(result: SqlResultSet): T[] => {
  const rows: T[] = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    rows.push(result.rows.item(i) as T);
  }
  return rows;
};

const mapCapabilityImport = (row: CapabilityImportRow): CapabilityImportRecord => ({
  id: row.id,
  projectId: row.project_id,
  companyName: row.company_name,
  sourceFilename: row.source_filename,
  importedAt: row.imported_at,
  archivedAt: row.archived_at,
});

const mapCapabilityImportRow = (row: CapabilityImportRowRow): CapabilityImportRowRecord => ({
  id: row.id,
  importId: row.import_id,
  requirementId: row.requirement_id,
  requirementNumber: row.requirement_number,
  requirementText: row.requirement_text,
  score: row.score,
  pastPerformance: row.past_performance,
  comments: row.comments,
});

const generateImportId = (): string =>
  `cimp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

let importRowSeed = 0;
const generateImportRowId = (): string => {
  importRowSeed += 1;
  return `cimpr-${Date.now().toString(36)}-${importRowSeed.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
};

export const listCapabilityImports = (
  projectId: string,
  includeArchived = false,
): Promise<CapabilityImportRecord[]> =>
  new Promise((resolve, reject) => {
    const db = getDatabase();
    const archivedClause = includeArchived ? '' : 'AND archived_at IS NULL';
    db.transaction((txn) => {
      txn.executeSql(
        `SELECT id, project_id, company_name, source_filename, imported_at, archived_at
         FROM capability_imports
         WHERE project_id = ?
         ${archivedClause}
         ORDER BY imported_at DESC`,
        [projectId],
        (_tx, result) => {
          const rows = mapRows<CapabilityImportRow>(result as SqlResultSet);
          resolve(rows.map(mapCapabilityImport));
        },
      );
    }, reject);
  });

export const listCapabilityImportRows = (importId: string): Promise<CapabilityImportRowRecord[]> =>
  new Promise((resolve, reject) => {
    const db = getDatabase();
    db.transaction((txn) => {
      txn.executeSql(
        `SELECT id, import_id, requirement_id, requirement_number, requirement_text,
                score, past_performance, comments
           FROM capability_import_rows
          WHERE import_id = ?
          ORDER BY requirement_number ASC`,
        [importId],
        (_tx, result) => {
          const rows = mapRows<CapabilityImportRowRow>(result as SqlResultSet);
          resolve(rows.map(mapCapabilityImportRow));
        },
      );
    }, reject);
  });

export const saveCapabilityImportWithRows = (
  input: SaveCapabilityImportInput,
): Promise<CapabilityImportRecord> =>
  new Promise((resolve, reject) => {
    const { projectId, companyName, sourceFilename, rows } = input;
    const trimmedCompany = companyName.trim();
    if (!trimmedCompany) {
      reject(new Error('Company name is required.'));
      return;
    }

    const db = getDatabase();
    const importId = generateImportId();

    db.transaction(
      (txn) => {
        txn.executeSql(
          `UPDATE capability_imports
             SET archived_at = CURRENT_TIMESTAMP
           WHERE project_id = ? AND company_name = ? AND archived_at IS NULL`,
          [projectId, trimmedCompany],
        );
        txn.executeSql(
          `INSERT INTO capability_imports
             (id, project_id, company_name, source_filename, imported_at, archived_at)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, NULL)`,
          [importId, projectId, trimmedCompany, sourceFilename ?? null],
        );

        rows.forEach((row) => {
          const rowId = generateImportRowId();
          txn.executeSql(
            `INSERT INTO capability_import_rows
               (id, import_id, requirement_id, requirement_number, requirement_text,
                score, past_performance, comments)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              rowId,
              importId,
              row.requirementId,
              row.requirementNumber,
              row.requirementText,
              row.score,
              row.pastPerformance ?? null,
              row.comments ?? null,
            ],
          );
        });
      },
      reject,
      () => {
        resolve({
          id: importId,
          projectId,
          companyName: trimmedCompany,
          sourceFilename: sourceFilename ?? null,
          importedAt: new Date().toISOString(),
          archivedAt: null,
        });
      },
    );
  });
