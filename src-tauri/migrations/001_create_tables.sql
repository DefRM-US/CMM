-- Create matrices table
CREATE TABLE IF NOT EXISTS matrices (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  is_imported INTEGER NOT NULL DEFAULT 0,
  source_file TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Create matrix_rows table
CREATE TABLE IF NOT EXISTS matrix_rows (
  id TEXT PRIMARY KEY NOT NULL,
  matrix_id TEXT NOT NULL,
  requirements TEXT NOT NULL DEFAULT '',
  experience_and_capability TEXT,
  past_performance TEXT NOT NULL DEFAULT '',
  comments TEXT NOT NULL DEFAULT '',
  row_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (matrix_id) REFERENCES matrices(id) ON DELETE CASCADE
);

-- Create app_settings table for application state persistence
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT
);

-- Create index for faster matrix row lookups
CREATE INDEX IF NOT EXISTS idx_matrix_rows_matrix_id ON matrix_rows(matrix_id);

-- Create index for ordered row retrieval
CREATE INDEX IF NOT EXISTS idx_matrix_rows_order ON matrix_rows(matrix_id, row_order);
