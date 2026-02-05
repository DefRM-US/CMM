import SQLite from 'react-native-sqlite-2';

const DB_NAME = 'app.db';

export const initDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const db = SQLite.openDatabase(DB_NAME, '1.0', '', 1);

    db.transaction(
      (txn) => {
        txn.executeSql('PRAGMA foreign_keys = ON', []);
        txn.executeSql(
          `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`,
          [],
        );
        txn.executeSql(
          `CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_opened_at DATETIME
          )`,
          [],
        );
        txn.executeSql(
          `CREATE TABLE IF NOT EXISTS requirements (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            text TEXT NOT NULL,
            level INTEGER NOT NULL,
            position INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
          )`,
          [],
        );
        txn.executeSql(
          `CREATE INDEX IF NOT EXISTS idx_requirements_project_id ON requirements (project_id)`,
          [],
        );
        txn.executeSql(
          `CREATE TABLE IF NOT EXISTS capability_imports (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            company_name TEXT NOT NULL,
            source_filename TEXT,
            imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            archived_at DATETIME,
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
          )`,
          [],
        );
        txn.executeSql(
          `CREATE INDEX IF NOT EXISTS idx_capability_imports_project_company
             ON capability_imports (project_id, company_name)`,
          [],
        );
        txn.executeSql(
          `CREATE INDEX IF NOT EXISTS idx_capability_imports_project_active
             ON capability_imports (project_id, archived_at)`,
          [],
        );
        txn.executeSql(
          `CREATE TABLE IF NOT EXISTS capability_import_rows (
            id TEXT PRIMARY KEY,
            import_id TEXT NOT NULL,
            requirement_id TEXT,
            requirement_number TEXT NOT NULL,
            requirement_text TEXT NOT NULL,
            score INTEGER,
            past_performance TEXT,
            comments TEXT,
            FOREIGN KEY(import_id) REFERENCES capability_imports(id) ON DELETE CASCADE,
            FOREIGN KEY(requirement_id) REFERENCES requirements(id) ON DELETE SET NULL
          )`,
          [],
        );
        txn.executeSql(
          `CREATE INDEX IF NOT EXISTS idx_capability_import_rows_import_id
             ON capability_import_rows (import_id)`,
          [],
        );
      },
      reject,
      resolve,
    );
  });
};

export const getDatabase = () => SQLite.openDatabase(DB_NAME, '1.0', '', 1);
