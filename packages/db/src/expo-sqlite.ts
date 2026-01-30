import * as SQLite from 'expo-sqlite';
import { generateId, getCurrentTimestamp } from '@cmm/core';
import type {
  CapabilityMatrix,
  CapabilityMatrixRow,
  CapabilityMatrixWithRows,
  CreateMatrixInput,
  CreateMatrixRowInput,
  UpdateMatrixRowInput,
  Score,
} from '@cmm/core';
import type { DatabaseInterface } from './interface';

/**
 * Parse score string to Score type
 */
function parseScore(value: string | number | null): Score {
  if (value === null || value === undefined) return null;
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  if (num >= 0 && num <= 3) return num as Score;
  return null;
}

/**
 * Database row type for matrices
 */
interface MatrixDbRow {
  id: string;
  name: string;
  is_imported: number;
  source_file: string | null;
  parent_matrix_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Database row type for matrix rows
 */
interface MatrixRowDbRow {
  id: string;
  matrix_id: string;
  requirement_number: string;
  requirements: string;
  experience_and_capability: string | null;
  past_performance: string;
  comments: string;
  row_order: number;
}

/**
 * Convert database row to CapabilityMatrix
 */
function mapMatrixRow(row: MatrixDbRow): CapabilityMatrix {
  return {
    id: row.id,
    name: row.name,
    isImported: row.is_imported === 1,
    sourceFile: row.source_file,
    parentMatrixId: row.parent_matrix_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert database row to CapabilityMatrixRow
 */
function mapMatrixRowRow(row: MatrixRowDbRow): CapabilityMatrixRow {
  return {
    id: row.id,
    matrixId: row.matrix_id,
    requirementNumber: row.requirement_number,
    requirements: row.requirements,
    experienceAndCapability: parseScore(row.experience_and_capability),
    pastPerformance: row.past_performance,
    comments: row.comments,
    rowOrder: row.row_order,
  };
}

/**
 * Expo SQLite implementation of DatabaseInterface
 */
export class ExpoSQLiteDatabase implements DatabaseInterface {
  private db: SQLite.SQLiteDatabase | null = null;
  private dbName: string;

  constructor(dbName: string = 'cmm.db') {
    this.dbName = dbName;
  }

  async initialize(): Promise<void> {
    this.db = await SQLite.openDatabaseAsync(this.dbName);

    // Run migrations
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS matrices (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        is_imported INTEGER NOT NULL DEFAULT 0,
        source_file TEXT,
        parent_matrix_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (parent_matrix_id) REFERENCES matrices(id)
      );

      CREATE TABLE IF NOT EXISTS matrix_rows (
        id TEXT PRIMARY KEY NOT NULL,
        matrix_id TEXT NOT NULL,
        requirement_number TEXT NOT NULL DEFAULT '',
        requirements TEXT NOT NULL DEFAULT '',
        experience_and_capability TEXT,
        past_performance TEXT NOT NULL DEFAULT '',
        comments TEXT NOT NULL DEFAULT '',
        row_order INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (matrix_id) REFERENCES matrices(id)
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_matrix_rows_matrix_id ON matrix_rows(matrix_id);
      CREATE INDEX IF NOT EXISTS idx_matrices_parent ON matrices(parent_matrix_id);
    `);
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }

  private getDb(): SQLite.SQLiteDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  // Matrix CRUD

  async getAllMatrices(): Promise<CapabilityMatrix[]> {
    const db = this.getDb();
    const results = await db.getAllAsync<MatrixDbRow>('SELECT * FROM matrices ORDER BY created_at DESC');
    return results.map(mapMatrixRow);
  }

  async getUserMatrices(): Promise<CapabilityMatrix[]> {
    const db = this.getDb();
    const results = await db.getAllAsync<MatrixDbRow>(
      'SELECT * FROM matrices WHERE is_imported = 0 ORDER BY created_at DESC'
    );
    return results.map(mapMatrixRow);
  }

  async getImportedMatrices(): Promise<CapabilityMatrix[]> {
    const db = this.getDb();
    const results = await db.getAllAsync<MatrixDbRow>(
      'SELECT * FROM matrices WHERE is_imported = 1 ORDER BY created_at DESC'
    );
    return results.map(mapMatrixRow);
  }

  async getTemplateMatrices(): Promise<CapabilityMatrix[]> {
    const db = this.getDb();
    const results = await db.getAllAsync<MatrixDbRow>(
      'SELECT * FROM matrices WHERE parent_matrix_id IS NULL ORDER BY created_at DESC'
    );
    return results.map(mapMatrixRow);
  }

  async getChildMatrices(parentId: string): Promise<CapabilityMatrix[]> {
    const db = this.getDb();
    const results = await db.getAllAsync<MatrixDbRow>(
      'SELECT * FROM matrices WHERE parent_matrix_id = ? ORDER BY created_at DESC',
      [parentId]
    );
    return results.map(mapMatrixRow);
  }

  async getMatrixById(id: string): Promise<CapabilityMatrix | null> {
    const db = this.getDb();
    const result = await db.getFirstAsync<MatrixDbRow>('SELECT * FROM matrices WHERE id = ?', [id]);
    return result ? mapMatrixRow(result) : null;
  }

  async getMatrixWithRows(id: string): Promise<CapabilityMatrixWithRows | null> {
    const matrix = await this.getMatrixById(id);
    if (!matrix) return null;

    const rows = await this.getMatrixRows(id);
    return { ...matrix, rows };
  }

  async createMatrix(input: CreateMatrixInput): Promise<CapabilityMatrix> {
    const db = this.getDb();
    const id = generateId('matrix');
    const now = getCurrentTimestamp();

    await db.runAsync(
      `INSERT INTO matrices (id, name, is_imported, source_file, parent_matrix_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.name, input.isImported ? 1 : 0, input.sourceFile ?? null, input.parentMatrixId ?? null, now, now]
    );

    return {
      id,
      name: input.name,
      isImported: input.isImported ?? false,
      sourceFile: input.sourceFile ?? null,
      parentMatrixId: input.parentMatrixId ?? null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateMatrixName(id: string, name: string): Promise<void> {
    const db = this.getDb();
    const now = getCurrentTimestamp();

    await db.runAsync('UPDATE matrices SET name = ?, updated_at = ? WHERE id = ?', [name, now, id]);
  }

  async deleteMatrix(id: string): Promise<void> {
    const db = this.getDb();

    // Delete rows first
    await db.runAsync('DELETE FROM matrix_rows WHERE matrix_id = ?', [id]);
    await db.runAsync('DELETE FROM matrices WHERE id = ?', [id]);
  }

  // Row CRUD

  async getMatrixRows(matrixId: string): Promise<CapabilityMatrixRow[]> {
    const db = this.getDb();
    const results = await db.getAllAsync<MatrixRowDbRow>(
      'SELECT * FROM matrix_rows WHERE matrix_id = ? ORDER BY row_order ASC',
      [matrixId]
    );
    return results.map(mapMatrixRowRow);
  }

  async createMatrixRow(input: CreateMatrixRowInput): Promise<CapabilityMatrixRow> {
    const db = this.getDb();
    const id = generateId('row');

    // Get the next row_order if not provided
    let rowOrder = input.rowOrder;
    if (rowOrder === undefined) {
      const result = await db.getFirstAsync<{ max_order: number | null }>(
        'SELECT MAX(row_order) as max_order FROM matrix_rows WHERE matrix_id = ?',
        [input.matrixId]
      );
      rowOrder = (result?.max_order ?? -1) + 1;
    }

    await db.runAsync(
      `INSERT INTO matrix_rows (id, matrix_id, requirement_number, requirements, experience_and_capability, past_performance, comments, row_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.matrixId,
        input.requirementNumber ?? '',
        input.requirements ?? '',
        input.experienceAndCapability?.toString() ?? null,
        input.pastPerformance ?? '',
        input.comments ?? '',
        rowOrder,
      ]
    );

    // Update matrix timestamp
    await this.updateMatrixTimestamp(input.matrixId);

    return {
      id,
      matrixId: input.matrixId,
      requirementNumber: input.requirementNumber ?? '',
      requirements: input.requirements ?? '',
      experienceAndCapability: input.experienceAndCapability ?? null,
      pastPerformance: input.pastPerformance ?? '',
      comments: input.comments ?? '',
      rowOrder,
    };
  }

  async updateMatrixRow(id: string, input: UpdateMatrixRowInput): Promise<void> {
    const db = this.getDb();

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (input.requirementNumber !== undefined) {
      updates.push('requirement_number = ?');
      values.push(input.requirementNumber);
    }
    if (input.requirements !== undefined) {
      updates.push('requirements = ?');
      values.push(input.requirements);
    }
    if (input.experienceAndCapability !== undefined) {
      updates.push('experience_and_capability = ?');
      values.push(input.experienceAndCapability?.toString() ?? null);
    }
    if (input.pastPerformance !== undefined) {
      updates.push('past_performance = ?');
      values.push(input.pastPerformance);
    }
    if (input.comments !== undefined) {
      updates.push('comments = ?');
      values.push(input.comments);
    }
    if (input.rowOrder !== undefined) {
      updates.push('row_order = ?');
      values.push(input.rowOrder);
    }

    if (updates.length === 0) return;

    values.push(id);
    await db.runAsync(`UPDATE matrix_rows SET ${updates.join(', ')} WHERE id = ?`, values);

    // Get matrix_id to update timestamp
    const row = await db.getFirstAsync<{ matrix_id: string }>('SELECT matrix_id FROM matrix_rows WHERE id = ?', [id]);
    if (row) {
      await this.updateMatrixTimestamp(row.matrix_id);
    }
  }

  async deleteMatrixRow(id: string): Promise<void> {
    const db = this.getDb();

    // Get matrix_id before deletion
    const row = await db.getFirstAsync<{ matrix_id: string }>('SELECT matrix_id FROM matrix_rows WHERE id = ?', [id]);

    await db.runAsync('DELETE FROM matrix_rows WHERE id = ?', [id]);

    if (row) {
      await this.updateMatrixTimestamp(row.matrix_id);
    }
  }

  async updateRowOrders(updates: Array<{ id: string; rowOrder: number }>): Promise<void> {
    const db = this.getDb();

    for (const update of updates) {
      await db.runAsync('UPDATE matrix_rows SET row_order = ? WHERE id = ?', [update.rowOrder, update.id]);
    }

    // Update matrix timestamp if there are any updates
    if (updates.length > 0) {
      const row = await db.getFirstAsync<{ matrix_id: string }>('SELECT matrix_id FROM matrix_rows WHERE id = ?', [
        updates[0].id,
      ]);
      if (row) {
        await this.updateMatrixTimestamp(row.matrix_id);
      }
    }
  }

  // Bulk operations

  async createEmptyRows(matrixId: string, count: number = 10): Promise<CapabilityMatrixRow[]> {
    const rows: CapabilityMatrixRow[] = [];
    for (let i = 0; i < count; i++) {
      const row = await this.createMatrixRow({
        matrixId,
        rowOrder: i,
      });
      rows.push(row);
    }
    return rows;
  }

  async createMatrixWithRows(input: CreateMatrixInput, rowCount: number = 10): Promise<CapabilityMatrixWithRows> {
    const matrix = await this.createMatrix(input);
    const rows = await this.createEmptyRows(matrix.id, rowCount);
    return { ...matrix, rows };
  }

  async deleteRowsByRequirement(requirement: string): Promise<{
    deletedCount: number;
    affectedMatrixIds: string[];
    deletedRows: CapabilityMatrixRow[];
  }> {
    const db = this.getDb();
    const normalizedReq = requirement.trim().toLowerCase();

    // Find all matching rows with their data (for undo support)
    const rows = await db.getAllAsync<MatrixRowDbRow>('SELECT * FROM matrix_rows WHERE LOWER(TRIM(requirements)) = ?', [
      normalizedReq,
    ]);

    if (rows.length === 0) {
      return { deletedCount: 0, affectedMatrixIds: [], deletedRows: [] };
    }

    // Map to CapabilityMatrixRow for return
    const deletedRows = rows.map(mapMatrixRowRow);

    // Delete all matching rows
    await db.runAsync('DELETE FROM matrix_rows WHERE LOWER(TRIM(requirements)) = ?', [normalizedReq]);

    // Get unique affected matrix IDs
    const affectedMatrixIds = [...new Set(rows.map((r) => r.matrix_id))];

    // Update timestamps for affected matrices
    const now = getCurrentTimestamp();
    for (const matrixId of affectedMatrixIds) {
      await db.runAsync('UPDATE matrices SET updated_at = ? WHERE id = ?', [now, matrixId]);
    }

    return {
      deletedCount: rows.length,
      affectedMatrixIds,
      deletedRows,
    };
  }

  async restoreRows(rows: CapabilityMatrixRow[]): Promise<void> {
    const db = this.getDb();
    const now = getCurrentTimestamp();
    const affectedMatrixIds = new Set<string>();

    for (const row of rows) {
      await db.runAsync(
        `INSERT INTO matrix_rows (id, matrix_id, requirement_number, requirements, experience_and_capability, past_performance, comments, row_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id,
          row.matrixId,
          row.requirementNumber,
          row.requirements,
          row.experienceAndCapability?.toString() ?? null,
          row.pastPerformance,
          row.comments,
          row.rowOrder,
        ]
      );
      affectedMatrixIds.add(row.matrixId);
    }

    // Update timestamps for affected matrices
    for (const matrixId of affectedMatrixIds) {
      await db.runAsync('UPDATE matrices SET updated_at = ? WHERE id = ?', [now, matrixId]);
    }
  }

  // Settings

  async getSetting(key: string): Promise<string | null> {
    const db = this.getDb();
    const result = await db.getFirstAsync<{ value: string | null }>('SELECT value FROM app_settings WHERE key = ?', [
      key,
    ]);
    return result?.value ?? null;
  }

  async setSetting(key: string, value: string | null): Promise<void> {
    const db = this.getDb();
    await db.runAsync(
      `INSERT INTO app_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = ?`,
      [key, value, value]
    );
  }

  async getActiveMatrixId(): Promise<string | null> {
    return this.getSetting('activeMatrixId');
  }

  async setActiveMatrixId(id: string | null): Promise<void> {
    await this.setSetting('activeMatrixId', id);
  }

  async getTheme(): Promise<'light' | 'dark' | null> {
    const value = await this.getSetting('theme');
    if (value === 'light' || value === 'dark') return value;
    return null;
  }

  async setTheme(theme: 'light' | 'dark' | null): Promise<void> {
    await this.setSetting('theme', theme);
  }

  // Stats

  async countMatrices(): Promise<{ total: number; user: number; imported: number }> {
    const db = this.getDb();

    const totalResult = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM matrices');
    const userResult = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM matrices WHERE is_imported = 0'
    );
    const importedResult = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM matrices WHERE is_imported = 1'
    );

    return {
      total: totalResult?.count ?? 0,
      user: userResult?.count ?? 0,
      imported: importedResult?.count ?? 0,
    };
  }

  // Private helpers

  private async updateMatrixTimestamp(matrixId: string): Promise<void> {
    const db = this.getDb();
    const now = getCurrentTimestamp();
    await db.runAsync('UPDATE matrices SET updated_at = ? WHERE id = ?', [now, matrixId]);
  }
}
