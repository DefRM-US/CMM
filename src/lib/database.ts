import Database from "@tauri-apps/plugin-sql";
import type {
  CapabilityMatrix,
  CapabilityMatrixRow,
  CapabilityMatrixWithRows,
  CreateMatrixInput,
  CreateMatrixRowInput,
  UpdateMatrixRowInput,
  Score,
} from "../types/matrix";

// Database instance singleton
let db: Database | null = null;

/**
 * Initialize and return the database connection
 * Uses singleton pattern to reuse connection
 */
export async function getDatabase(): Promise<Database> {
  if (!db) {
    db = await Database.load("sqlite:cmm.db");
  }
  return db;
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Generate a unique ID for matrices and rows
 */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get current ISO timestamp
 */
function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Parse score string to Score type
 */
function parseScore(value: string | null): Score {
  if (value === null) return null;
  const num = parseInt(value, 10);
  if (num >= 0 && num <= 3) return num as Score;
  return null;
}

// ============================================
// Matrix CRUD Operations
// ============================================

/**
 * Get all matrices
 */
export async function getAllMatrices(): Promise<CapabilityMatrix[]> {
  const database = await getDatabase();
  const results = await database.select<
    Array<{
      id: string;
      name: string;
      is_imported: number;
      source_file: string | null;
      created_at: string;
      updated_at: string;
    }>
  >("SELECT * FROM matrices ORDER BY created_at DESC");

  return results.map((row) => ({
    id: row.id,
    name: row.name,
    isImported: row.is_imported === 1,
    sourceFile: row.source_file,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Get user-created matrices only
 */
export async function getUserMatrices(): Promise<CapabilityMatrix[]> {
  const database = await getDatabase();
  const results = await database.select<
    Array<{
      id: string;
      name: string;
      is_imported: number;
      source_file: string | null;
      created_at: string;
      updated_at: string;
    }>
  >("SELECT * FROM matrices WHERE is_imported = 0 ORDER BY created_at DESC");

  return results.map((row) => ({
    id: row.id,
    name: row.name,
    isImported: false,
    sourceFile: row.source_file,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Get imported matrices only
 */
export async function getImportedMatrices(): Promise<CapabilityMatrix[]> {
  const database = await getDatabase();
  const results = await database.select<
    Array<{
      id: string;
      name: string;
      is_imported: number;
      source_file: string | null;
      created_at: string;
      updated_at: string;
    }>
  >("SELECT * FROM matrices WHERE is_imported = 1 ORDER BY created_at DESC");

  return results.map((row) => ({
    id: row.id,
    name: row.name,
    isImported: true,
    sourceFile: row.source_file,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Get a single matrix by ID
 */
export async function getMatrixById(
  id: string
): Promise<CapabilityMatrix | null> {
  const database = await getDatabase();
  const results = await database.select<
    Array<{
      id: string;
      name: string;
      is_imported: number;
      source_file: string | null;
      created_at: string;
      updated_at: string;
    }>
  >("SELECT * FROM matrices WHERE id = $1", [id]);

  if (results.length === 0) return null;

  const row = results[0];
  return {
    id: row.id,
    name: row.name,
    isImported: row.is_imported === 1,
    sourceFile: row.source_file,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get a matrix with all its rows
 */
export async function getMatrixWithRows(
  id: string
): Promise<CapabilityMatrixWithRows | null> {
  const matrix = await getMatrixById(id);
  if (!matrix) return null;

  const rows = await getMatrixRows(id);
  return { ...matrix, rows };
}

/**
 * Create a new matrix
 */
export async function createMatrix(
  input: CreateMatrixInput
): Promise<CapabilityMatrix> {
  const database = await getDatabase();
  const id = generateId("matrix");
  const now = getCurrentTimestamp();

  await database.execute(
    `INSERT INTO matrices (id, name, is_imported, source_file, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, input.name, input.isImported ? 1 : 0, input.sourceFile ?? null, now, now]
  );

  return {
    id,
    name: input.name,
    isImported: input.isImported ?? false,
    sourceFile: input.sourceFile ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Update a matrix's name
 */
export async function updateMatrixName(id: string, name: string): Promise<void> {
  const database = await getDatabase();
  const now = getCurrentTimestamp();

  await database.execute(
    "UPDATE matrices SET name = $1, updated_at = $2 WHERE id = $3",
    [name, now, id]
  );
}

/**
 * Delete a matrix and all its rows (cascade)
 */
export async function deleteMatrix(id: string): Promise<void> {
  const database = await getDatabase();

  // Delete rows first (SQLite foreign key cascade may not be enabled by default)
  await database.execute("DELETE FROM matrix_rows WHERE matrix_id = $1", [id]);
  await database.execute("DELETE FROM matrices WHERE id = $1", [id]);
}

// ============================================
// Matrix Row CRUD Operations
// ============================================

/**
 * Get all rows for a matrix, ordered by row_order
 */
export async function getMatrixRows(
  matrixId: string
): Promise<CapabilityMatrixRow[]> {
  const database = await getDatabase();
  const results = await database.select<
    Array<{
      id: string;
      matrix_id: string;
      requirements: string;
      experience_and_capability: string | null;
      past_performance: string;
      comments: string;
      row_order: number;
    }>
  >("SELECT * FROM matrix_rows WHERE matrix_id = $1 ORDER BY row_order ASC", [
    matrixId,
  ]);

  return results.map((row) => ({
    id: row.id,
    matrixId: row.matrix_id,
    requirements: row.requirements,
    experienceAndCapability: parseScore(row.experience_and_capability),
    pastPerformance: row.past_performance,
    comments: row.comments,
    rowOrder: row.row_order,
  }));
}

/**
 * Create a new matrix row
 */
export async function createMatrixRow(
  input: CreateMatrixRowInput
): Promise<CapabilityMatrixRow> {
  const database = await getDatabase();
  const id = generateId("row");

  // Get the next row_order if not provided
  let rowOrder = input.rowOrder;
  if (rowOrder === undefined) {
    const result = await database.select<Array<{ max_order: number | null }>>(
      "SELECT MAX(row_order) as max_order FROM matrix_rows WHERE matrix_id = $1",
      [input.matrixId]
    );
    rowOrder = (result[0]?.max_order ?? -1) + 1;
  }

  await database.execute(
    `INSERT INTO matrix_rows (id, matrix_id, requirements, experience_and_capability, past_performance, comments, row_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
      input.matrixId,
      input.requirements ?? "",
      input.experienceAndCapability?.toString() ?? null,
      input.pastPerformance ?? "",
      input.comments ?? "",
      rowOrder,
    ]
  );

  // Update matrix timestamp
  await updateMatrixTimestamp(input.matrixId);

  return {
    id,
    matrixId: input.matrixId,
    requirements: input.requirements ?? "",
    experienceAndCapability: input.experienceAndCapability ?? null,
    pastPerformance: input.pastPerformance ?? "",
    comments: input.comments ?? "",
    rowOrder,
  };
}

/**
 * Update a matrix row
 */
export async function updateMatrixRow(
  id: string,
  input: UpdateMatrixRowInput
): Promise<void> {
  const database = await getDatabase();

  // Build update query dynamically based on provided fields
  const updates: string[] = [];
  const values: (string | number | null)[] = [];
  let paramIndex = 1;

  if (input.requirements !== undefined) {
    updates.push(`requirements = $${paramIndex++}`);
    values.push(input.requirements);
  }
  if (input.experienceAndCapability !== undefined) {
    updates.push(`experience_and_capability = $${paramIndex++}`);
    values.push(input.experienceAndCapability?.toString() ?? null);
  }
  if (input.pastPerformance !== undefined) {
    updates.push(`past_performance = $${paramIndex++}`);
    values.push(input.pastPerformance);
  }
  if (input.comments !== undefined) {
    updates.push(`comments = $${paramIndex++}`);
    values.push(input.comments);
  }
  if (input.rowOrder !== undefined) {
    updates.push(`row_order = $${paramIndex++}`);
    values.push(input.rowOrder);
  }

  if (updates.length === 0) return;

  values.push(id);
  await database.execute(
    `UPDATE matrix_rows SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
    values
  );

  // Get matrix_id to update timestamp
  const row = await database.select<Array<{ matrix_id: string }>>(
    "SELECT matrix_id FROM matrix_rows WHERE id = $1",
    [id]
  );
  if (row.length > 0) {
    await updateMatrixTimestamp(row[0].matrix_id);
  }
}

/**
 * Delete a matrix row
 */
export async function deleteMatrixRow(id: string): Promise<void> {
  const database = await getDatabase();

  // Get matrix_id before deletion
  const row = await database.select<Array<{ matrix_id: string }>>(
    "SELECT matrix_id FROM matrix_rows WHERE id = $1",
    [id]
  );

  await database.execute("DELETE FROM matrix_rows WHERE id = $1", [id]);

  if (row.length > 0) {
    await updateMatrixTimestamp(row[0].matrix_id);
  }
}

/**
 * Bulk update row orders (for drag-and-drop reordering)
 */
export async function updateRowOrders(
  updates: Array<{ id: string; rowOrder: number }>
): Promise<void> {
  const database = await getDatabase();

  for (const update of updates) {
    await database.execute(
      "UPDATE matrix_rows SET row_order = $1 WHERE id = $2",
      [update.rowOrder, update.id]
    );
  }

  // Update matrix timestamp if there are any updates
  if (updates.length > 0) {
    const row = await database.select<Array<{ matrix_id: string }>>(
      "SELECT matrix_id FROM matrix_rows WHERE id = $1",
      [updates[0].id]
    );
    if (row.length > 0) {
      await updateMatrixTimestamp(row[0].matrix_id);
    }
  }
}

/**
 * Update matrix updated_at timestamp
 */
async function updateMatrixTimestamp(matrixId: string): Promise<void> {
  const database = await getDatabase();
  const now = getCurrentTimestamp();
  await database.execute("UPDATE matrices SET updated_at = $1 WHERE id = $2", [
    now,
    matrixId,
  ]);
}

/**
 * Create multiple empty rows for a new matrix
 */
export async function createEmptyRows(
  matrixId: string,
  count: number = 10
): Promise<CapabilityMatrixRow[]> {
  const rows: CapabilityMatrixRow[] = [];
  for (let i = 0; i < count; i++) {
    const row = await createMatrixRow({
      matrixId,
      rowOrder: i,
    });
    rows.push(row);
  }
  return rows;
}

// ============================================
// App Settings Operations
// ============================================

/**
 * Get an app setting by key
 */
export async function getSetting(key: string): Promise<string | null> {
  const database = await getDatabase();
  const results = await database.select<Array<{ value: string | null }>>(
    "SELECT value FROM app_settings WHERE key = $1",
    [key]
  );
  return results.length > 0 ? results[0].value : null;
}

/**
 * Set an app setting
 */
export async function setSetting(
  key: string,
  value: string | null
): Promise<void> {
  const database = await getDatabase();
  await database.execute(
    `INSERT INTO app_settings (key, value) VALUES ($1, $2)
     ON CONFLICT(key) DO UPDATE SET value = $2`,
    [key, value]
  );
}

/**
 * Get the active matrix ID
 */
export async function getActiveMatrixId(): Promise<string | null> {
  return getSetting("activeMatrixId");
}

/**
 * Set the active matrix ID
 */
export async function setActiveMatrixId(id: string | null): Promise<void> {
  await setSetting("activeMatrixId", id);
}

/**
 * Get the theme preference
 */
export async function getTheme(): Promise<"light" | "dark" | null> {
  const value = await getSetting("theme");
  if (value === "light" || value === "dark") return value;
  return null;
}

/**
 * Set the theme preference
 */
export async function setTheme(theme: "light" | "dark" | null): Promise<void> {
  await setSetting("theme", theme);
}

// ============================================
// Utility Functions
// ============================================

/**
 * Create a new matrix with default empty rows
 */
export async function createMatrixWithRows(
  input: CreateMatrixInput,
  rowCount: number = 10
): Promise<CapabilityMatrixWithRows> {
  const matrix = await createMatrix(input);
  const rows = await createEmptyRows(matrix.id, rowCount);
  return { ...matrix, rows };
}

/**
 * Count total matrices
 */
export async function countMatrices(): Promise<{
  total: number;
  user: number;
  imported: number;
}> {
  const database = await getDatabase();

  const totalResult = await database.select<Array<{ count: number }>>(
    "SELECT COUNT(*) as count FROM matrices"
  );
  const userResult = await database.select<Array<{ count: number }>>(
    "SELECT COUNT(*) as count FROM matrices WHERE is_imported = 0"
  );
  const importedResult = await database.select<Array<{ count: number }>>(
    "SELECT COUNT(*) as count FROM matrices WHERE is_imported = 1"
  );

  return {
    total: totalResult[0]?.count ?? 0,
    user: userResult[0]?.count ?? 0,
    imported: importedResult[0]?.count ?? 0,
  };
}
