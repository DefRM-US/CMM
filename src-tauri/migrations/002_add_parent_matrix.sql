-- Add parent_matrix_id column to link imported matrices to their template
ALTER TABLE matrices ADD COLUMN parent_matrix_id TEXT REFERENCES matrices(id) ON DELETE CASCADE;

-- Create index for faster child matrix lookups
CREATE INDEX IF NOT EXISTS idx_matrices_parent ON matrices(parent_matrix_id);
