import SQLite from 'react-native-sqlite-2';

const DB_NAME = 'app.db';

export const initDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const db = SQLite.openDatabase(DB_NAME, '1.0', '', 1);

    db.transaction(
      (txn) => {
        txn.executeSql(
          `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`,
          [],
        );
      },
      reject,
      resolve,
    );
  });
};

export const getDatabase = () => SQLite.openDatabase(DB_NAME, '1.0', '', 1);
