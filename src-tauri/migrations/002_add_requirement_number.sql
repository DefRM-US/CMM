-- Add requirement_number column for hierarchical numbering (e.g., "1", "1.1", "1.2.1")
ALTER TABLE matrix_rows ADD COLUMN requirement_number TEXT NOT NULL DEFAULT '';
