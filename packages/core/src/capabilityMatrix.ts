import { getDatabase } from './database';

export interface ProjectRecord {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string | null;
}

export interface StoredRequirementRow {
  id: string;
  text: string;
  level: number;
  position: number;
}

type ProjectRow = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  last_opened_at: string | null;
};

type RequirementRowRecord = {
  id: string;
  text: string;
  level: number;
  position: number;
};

type SqlResultSet = {
  rows: {
    length: number;
    item: (index: number) => unknown;
  };
};

const mapRows = <T>(result: SqlResultSet): T[] => {
  const rows: T[] = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    rows.push(result.rows.item(i) as T);
  }
  return rows;
};

const mapProjectRow = (row: ProjectRow): ProjectRecord => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  lastOpenedAt: row.last_opened_at,
});

const generateProjectId = (): string =>
  `proj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const listProjects = (): Promise<ProjectRecord[]> =>
  new Promise((resolve, reject) => {
    const db = getDatabase();
    db.transaction((txn) => {
      txn.executeSql(
        `SELECT id, name, created_at, updated_at, last_opened_at
           FROM projects
           ORDER BY last_opened_at DESC, created_at DESC`,
        [],
        (_tx, result) => {
          const rows = mapRows<ProjectRow>(result as SqlResultSet);
          resolve(rows.map(mapProjectRow));
        },
      );
    }, reject);
  });

export const createProject = (name: string): Promise<ProjectRecord> =>
  new Promise((resolve, reject) => {
    const trimmed = name.trim();
    if (!trimmed) {
      reject(new Error('Project name is required.'));
      return;
    }

    const db = getDatabase();
    const projectId = generateProjectId();
    let created: ProjectRecord | null = null;

    db.transaction(
      (txn) => {
        txn.executeSql(
          `INSERT INTO projects (id, name, created_at, updated_at, last_opened_at)
           VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [projectId, trimmed],
        );
        txn.executeSql(
          `SELECT id, name, created_at, updated_at, last_opened_at
           FROM projects
           WHERE id = ?`,
          [projectId],
          (_tx, result) => {
            const row = mapRows<ProjectRow>(result as SqlResultSet)[0];
            if (row) {
              created = mapProjectRow(row);
            }
          },
        );
      },
      reject,
      () => {
        if (created) {
          resolve(created);
        } else {
          reject(new Error('Failed to create project.'));
        }
      },
    );
  });

export const touchProject = (projectId: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const db = getDatabase();
    db.transaction(
      (txn) => {
        txn.executeSql(
          `UPDATE projects
           SET last_opened_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [projectId],
        );
      },
      reject,
      resolve,
    );
  });

export const loadProjectRequirements = (projectId: string): Promise<StoredRequirementRow[]> =>
  new Promise((resolve, reject) => {
    const db = getDatabase();
    db.transaction((txn) => {
      txn.executeSql(
        `SELECT id, text, level, position
           FROM requirements
           WHERE project_id = ?
           ORDER BY position ASC`,
        [projectId],
        (_tx, result) => {
          const rows = mapRows<RequirementRowRecord>(result as SqlResultSet);
          resolve(
            rows.map((row) => ({
              id: row.id,
              text: row.text,
              level: row.level,
              position: row.position,
            })),
          );
        },
      );
    }, reject);
  });

export const saveProjectRequirements = (
  projectId: string,
  rows: StoredRequirementRow[],
): Promise<void> =>
  new Promise((resolve, reject) => {
    const db = getDatabase();
    db.transaction(
      (txn) => {
        txn.executeSql(`DELETE FROM requirements WHERE project_id = ?`, [projectId]);
        rows.forEach((row, index) => {
          txn.executeSql(
            `INSERT INTO requirements (id, project_id, text, level, position, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [row.id, projectId, row.text, row.level, row.position ?? index],
          );
        });
        txn.executeSql(`UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [
          projectId,
        ]);
      },
      reject,
      resolve,
    );
  });
