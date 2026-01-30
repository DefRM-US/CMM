export type { DatabaseInterface } from "./interface";
export { ExpoSQLiteDatabase } from "./expo-sqlite";

import { ExpoSQLiteDatabase } from "./expo-sqlite";
import type { DatabaseInterface } from "./interface";

// Singleton database instance
let dbInstance: DatabaseInterface | null = null;

/**
 * Get or create the database instance
 * Uses ExpoSQLiteDatabase which works on iOS, Android, and macOS
 */
export async function getDatabase(): Promise<DatabaseInterface> {
  if (!dbInstance) {
    dbInstance = new ExpoSQLiteDatabase();
    await dbInstance.initialize();
  }
  return dbInstance;
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Create a new database instance (for testing or custom usage)
 */
export function createDatabase(dbName?: string): DatabaseInterface {
  return new ExpoSQLiteDatabase(dbName);
}
