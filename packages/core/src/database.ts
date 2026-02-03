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
      },
      reject,
      resolve,
    );
  });
};

export const getDatabase = () => SQLite.openDatabase(DB_NAME, '1.0', '', 1);
